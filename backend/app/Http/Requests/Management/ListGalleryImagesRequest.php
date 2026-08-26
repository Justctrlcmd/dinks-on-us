<?php

namespace App\Http\Requests\Management;

use Illuminate\Foundation\Http\FormRequest;

class ListGalleryImagesRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return ['gallery_tab_id' => ['required', 'integer', 'exists:gallery_tabs,id']];
    }
}
