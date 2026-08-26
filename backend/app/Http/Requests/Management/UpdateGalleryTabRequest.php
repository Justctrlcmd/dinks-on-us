<?php

namespace App\Http\Requests\Management;

use Illuminate\Validation\Rule;

class UpdateGalleryTabRequest extends StoreGalleryTabRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('gallery_tabs', 'name')->ignore($this->route('galleryTab')),
                $this->uniqueCategoryName(),
            ],
        ];
    }
}
