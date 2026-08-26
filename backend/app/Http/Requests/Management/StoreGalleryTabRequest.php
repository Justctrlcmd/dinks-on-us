<?php

namespace App\Http\Requests\Management;

use App\Http\Requests\Concerns\NormalizesInput;
use App\Models\GalleryTab;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class StoreGalleryTabRequest extends FormRequest
{
    use NormalizesInput;

    protected function prepareForValidation(): void
    {
        $this->merge(['name' => $this->normalizedText($this->input('name'))]);
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:100', 'unique:gallery_tabs,name', $this->uniqueCategoryName()]];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['name.unique' => 'A gallery category with this name already exists.'];
    }

    protected function uniqueCategoryName(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value)) {
                return;
            }

            $query = GalleryTab::query()->whereRaw('LOWER(name) = ?', [mb_strtolower($value)]);
            $current = $this->route('galleryTab');

            if ($current instanceof GalleryTab) {
                $query->whereKeyNot($current->id);
            }

            if ($query->exists()) {
                $fail('A gallery category with this name already exists.');
            }
        };
    }
}
