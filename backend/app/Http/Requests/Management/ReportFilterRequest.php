<?php

namespace App\Http\Requests\Management;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReportFilterRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d'],
            'court_id' => ['nullable', 'integer', Rule::exists('courts', 'id')],
            'source' => ['nullable', Rule::in(['ONLINE', 'WALK_IN'])],
            'group_by' => ['nullable', Rule::in(['day', 'week', 'month'])],
        ];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['from', 'to'])) {
                return;
            }

            $from = CarbonImmutable::createFromFormat('Y-m-d', (string) $this->input('from'), 'Asia/Manila')->startOfDay();
            $to = CarbonImmutable::createFromFormat('Y-m-d', (string) $this->input('to'), 'Asia/Manila')->startOfDay();
            $today = CarbonImmutable::now('Asia/Manila')->startOfDay();

            if ($from->greaterThan($to)) {
                $validator->errors()->add('to', 'The end date must be on or after the start date.');
            }

            if ($to->greaterThan($today)) {
                $validator->errors()->add('to', 'Reports cannot include future dates.');
            }
        }];
    }
}
