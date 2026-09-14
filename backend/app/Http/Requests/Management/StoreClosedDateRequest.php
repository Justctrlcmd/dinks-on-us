<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use App\Support\BusinessClock;
use Illuminate\Foundation\Http\FormRequest;

class StoreClosedDateRequest extends FormRequest
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
            'date' => ['required', 'date_format:Y-m-d', BusinessClock::todayOrLaterRule()],
            'reason' => ['required', 'string', 'max:1000'],
        ];
    }
}
