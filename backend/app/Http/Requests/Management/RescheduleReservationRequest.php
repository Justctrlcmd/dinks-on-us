<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RescheduleReservationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'slots' => ['required', 'array', 'min:1', 'max:48'],
            'slots.*.court_id' => ['required', 'integer', 'exists:courts,id'],
            'slots.*.date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'slots.*.start_hour' => ['required', 'integer', 'between:0,23'],
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
            $keys = $slots->map(fn (array $slot): string => "{$slot['court_id']}-{$slot['date']}-{$slot['start_hour']}");
            if ($keys->unique()->count() !== $keys->count()) {
                $validator->errors()->add('slots', 'Replacement slots cannot contain duplicates.');
            }
        }];
    }
}
