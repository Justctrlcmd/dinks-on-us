<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateCourtConfigurationRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'opening_hour' => ['required', 'integer', 'between:0,23'],
            'closing_hour' => ['required', 'integer', 'between:1,24', 'gt:opening_hour'],
            'included_players_per_court' => ['required', 'integer', 'between:1,100'],
            'additional_player_price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'advance_booking_days' => ['required', 'integer', 'between:1,365'],
            'weekday_rates' => ['required', 'array', 'min:1', 'max:24'],
            'weekday_rates.*.start_hour' => ['required', 'integer', 'between:0,23'],
            'weekday_rates.*.end_hour' => ['required', 'integer', 'between:1,24'],
            'weekday_rates.*.price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'weekend_rates' => ['required', 'array', 'min:1', 'max:24'],
            'weekend_rates.*.start_hour' => ['required', 'integer', 'between:0,23'],
            'weekend_rates.*.end_hour' => ['required', 'integer', 'between:1,24'],
            'weekend_rates.*.price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            foreach (['weekday_rates', 'weekend_rates'] as $field) {
                $expectedStart = (int) $this->input('opening_hour');
                $closingHour = (int) $this->input('closing_hour');

                foreach ($this->input($field, []) as $index => $period) {
                    $start = (int) ($period['start_hour'] ?? -1);
                    $end = (int) ($period['end_hour'] ?? -1);

                    if ($start !== $expectedStart) {
                        $validator->errors()->add("{$field}.{$index}.start_hour", 'Price periods must continue from the previous ending time without gaps or overlaps.');
                    }

                    if ($end <= $start || $end > $closingHour) {
                        $validator->errors()->add("{$field}.{$index}.end_hour", 'Choose an ending time after the starting time and no later than closing.');
                    }

                    $expectedStart = $end;
                }

                if ($expectedStart !== $closingHour) {
                    $validator->errors()->add($field, 'Price periods must cover every hour from opening through closing.');
                }
            }
        }];
    }
}
