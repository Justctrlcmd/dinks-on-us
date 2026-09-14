<?php

namespace App\Http\Requests\Management;

use App\Support\BusinessClock;
use App\Support\Security\ImageUploadRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RescheduleReservationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'slots' => ['required', 'array', 'min:1', 'max:48'],
            'slots.*.court_id' => ['required', 'integer', 'exists:courts,id'],
            'slots.*.date' => ['required', 'date_format:Y-m-d', BusinessClock::todayOrLaterRule()],
            'slots.*.start_hour' => ['required', 'integer', 'between:0,23'],
            'add_on_slots' => ['sometimes', 'array', 'max:48'],
            'add_on_slots.*.court_id' => ['required', 'integer', 'exists:courts,id'],
            'add_on_slots.*.date' => ['required', 'date_format:Y-m-d', BusinessClock::todayOrLaterRule()],
            'add_on_slots.*.start_hour' => ['required', 'integer', 'between:0,23'],
            'additional_players' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'equipment' => ['sometimes', 'array', 'max:30'],
            'equipment.*.id' => ['required', 'integer', 'distinct', 'exists:rental_equipment,id'],
            'equipment.*.quantity' => ['required', 'integer', 'min:0', 'max:1000'],
            'payment_channel' => ['nullable', Rule::in(['CASH', 'EWALLET_BANK'])],
            'payment_method_id' => [
                Rule::requiredIf(fn (): bool => $this->input('payment_channel') === 'EWALLET_BANK'),
                Rule::prohibitedIf(fn (): bool => $this->input('payment_channel') !== 'EWALLET_BANK'),
                'nullable', 'integer', 'exists:payment_methods,id',
            ],
            'payment_reference_number' => [
                Rule::requiredIf(fn (): bool => $this->input('payment_channel') === 'EWALLET_BANK'),
                Rule::prohibitedIf(fn (): bool => $this->input('payment_channel') !== 'EWALLET_BANK'),
                'nullable', 'string', 'max:180',
            ],
            'payment_proof' => [
                Rule::requiredIf(fn (): bool => $this->input('payment_channel') === 'EWALLET_BANK'),
                Rule::prohibitedIf(fn (): bool => $this->input('payment_channel') !== 'EWALLET_BANK'),
                ...ImageUploadRules::optional(),
            ],
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
                $validator->errors()->add('slots', 'All replacement slots must use the same date.');
            }
            $addOnSlots = collect($this->input('add_on_slots', []));
            if ($addOnSlots->isNotEmpty() && $addOnSlots->pluck('date')->unique()->count() !== 1) {
                $validator->errors()->add('add_on_slots', 'All added court times must use the same date.');
            }
            if ($addOnSlots->isNotEmpty() && $slots->pluck('date')->first() !== $addOnSlots->pluck('date')->first()) {
                $validator->errors()->add('add_on_slots', 'Added court times must use the replacement date.');
            }
            $keys = $slots->concat($addOnSlots)->map(fn (array $slot): string => "{$slot['court_id']}-{$slot['date']}-{$slot['start_hour']}");
            if ($keys->unique()->count() !== $keys->count()) {
                $validator->errors()->add('slots', 'Selected court times cannot contain duplicates.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'payment_proof.required' => 'Select a receipt image for this payment method.',
            'payment_method_id.required' => 'Choose an active e-wallet or bank payment method.',
            'payment_method_id.prohibited' => 'A configured payment method cannot be used without an online payment.',
            'payment_reference_number.required' => 'Enter the transaction reference for this payment method.',
            'payment_reference_number.prohibited' => 'A transaction reference is only used for e-wallet or bank payments.',
            'payment_proof.prohibited' => 'A payment receipt is only used for e-wallet or bank payments.',
        ];
    }
}
