<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAvailabilityBlockRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['reason' => $this->normalizedMultilineText($this->input('reason'))]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'court_id' => ['required', 'integer', 'exists:courts,id'],
            'periods' => ['required', 'array', 'min:1', 'max:24'],
            'periods.*.start_hour' => ['required', 'integer', 'between:0,23'],
            'periods.*.end_hour' => ['required', 'integer', 'between:1,24'],
            'reason' => ['required', 'string', 'max:1000'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $periods = collect($this->input('periods'))
                ->map(fn (array $period, int $index): array => [...$period, 'index' => $index])
                ->sortBy('start_hour')
                ->values();

            $previousEnd = null;
            foreach ($periods as $period) {
                $start = (int) $period['start_hour'];
                $end = (int) $period['end_hour'];
                $index = $period['index'];

                if ($end <= $start) {
                    $validator->errors()->add("periods.{$index}.end_hour", 'Choose an ending time after the starting time.');
                }

                if ($previousEnd !== null && $start < $previousEnd) {
                    $validator->errors()->add("periods.{$index}.start_hour", 'Time ranges cannot overlap.');
                }

                $previousEnd = max($previousEnd ?? $end, $end);
            }
        }];
    }
}
