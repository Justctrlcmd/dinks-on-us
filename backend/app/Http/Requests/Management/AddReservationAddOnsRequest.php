<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AddReservationAddOnsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'slots' => ['sometimes', 'array', 'max:48'],
            'slots.*.court_id' => ['required', 'integer', 'exists:courts,id'],
            'slots.*.date' => ['required', 'date_format:Y-m-d'],
            'slots.*.start_hour' => ['required', 'integer', 'between:0,23'],
            'additional_players' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'equipment' => ['sometimes', 'array', 'max:30'],
            'equipment.*.id' => ['required', 'integer', 'exists:rental_equipment,id'],
            'equipment.*.quantity' => ['required', 'integer', 'min:1', 'max:1000'],
            'payment_channel' => ['required', Rule::in(['CASH', 'EWALLET', 'BANK'])],
            'payment_reference_number' => ['nullable', 'string', 'max:180'],
            'payment_proof' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) return;
            $hasSlots = count($this->input('slots', [])) > 0;
            $hasPlayers = (int) $this->input('additional_players', 0) > 0;
            $hasEquipment = count($this->input('equipment', [])) > 0;
            if (! $hasSlots && ! $hasPlayers && ! $hasEquipment) $validator->errors()->add('add_ons', 'Add at least one court time, player, or equipment item.');
        }];
    }
}
