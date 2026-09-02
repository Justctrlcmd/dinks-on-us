<?php

namespace App\Support\Security;

final class ImageUploadRules
{
    /** @return list<string> */
    public static function required(): array
    {
        return [
            'required',
            'file',
            'image',
            'mimes:jpg,jpeg,png,webp',
            'extensions:jpg,jpeg,png,webp',
            'max:5120',
            'dimensions:min_width=1,min_height=1,max_width=8000,max_height=8000',
        ];
    }

    /** @return list<string> */
    public static function optional(): array
    {
        return [
            'nullable',
            ...array_slice(self::required(), 1),
        ];
    }
}
