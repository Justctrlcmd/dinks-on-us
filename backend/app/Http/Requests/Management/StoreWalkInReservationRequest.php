<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreWalkInReservationRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'customer_name' => $this->normalizedText($this->input('customer_name')),
            'customer_email' => is_string($this->input('customer_email'))
                ? mb_strtolower(trim($this->input('customer_email')))
                : $this->input('customer_email'),
            'customer_contact_number' => $this->normalizedText($this->input('customer_contact_number')),
            'payment_reference_number' => $this->normalizedText($this->input('payment_reference_number')),
        ]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:180'],
            'customer_email' => ['required', 'email:rfc', 'max:180'],
            'customer_contact_number' => ['required', 'string', 'size:11', 'regex:/^09[0-9]{9}$/'],
            'slots' => ['required', 'array', 'min:1', 'max:48'],
            'slots.*.court_id' => ['required', 'integer', 'exists:courts,id'],
            'slots.*.date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'slots.*.start_hour' => ['required', 'integer', 'between:0,23'],
            'equipment' => ['sometimes', 'array', 'max:30'],
            'equipment.*.id' => ['required', 'integer', 'exists:rental_equipment,id'],
            'equipment.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'additional_players' => ['required', 'integer', 'min:0', 'max:1000'],
            'payment_channel' => ['required', Rule::in(['CASH', 'EWALLET_BANK'])],
            'payment_reference_number' => ['nullable', 'string', 'max:180'],
            'payment_proof' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $slots = collect($this->input('slots'));
            if ($slots->pluck('date')->unique()->count() !== 1) {
                $validator->errors()->add('slots', 'All selected slots must use the same booking date.');
            }

            $keys = $slots->map(fn (array $slot): string => "{$slot['court_id']}-{$slot['date']}-{$slot['start_hour']}");
            if ($keys->unique()->count() !== $keys->count()) {
                $validator->errors()->add('slots', 'The same court time cannot be selected more than once.');
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'payment_proof.mimes' => 'The receipt must be a JPG, PNG, or WebP image.',
            'payment_proof.max' => 'The receipt must not be larger than 5 MB.',
            'customer_contact_number.size' => 'The contact number must contain exactly 11 digits.',
            'customer_contact_number.regex' => 'The contact number must contain only digits and start with 09.',
        ];
    }
}
