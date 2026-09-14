<?php

namespace App\Http\Requests\Management;

use App\Support\BusinessClock;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

abstract class PaymentProofDateRangeRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d'],
        ];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['from', 'to'])) {
                return;
            }

            $from = CarbonImmutable::createFromFormat('Y-m-d', (string) $this->input('from'), BusinessClock::timezone());
            $to = CarbonImmutable::createFromFormat('Y-m-d', (string) $this->input('to'), BusinessClock::timezone());

            if ($from->greaterThan($to)) {
                $validator->errors()->add('to', 'The end date must be on or after the start date.');
            }
        }];
    }
}
