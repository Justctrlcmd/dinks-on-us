<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class OptimizedImageStorageService
{
    private const MAX_BYTES = 5 * 1024 * 1024;

    private const MAX_PIXELS = 25_000_000;

    private const MAX_DIMENSION = 2400;

    private const WEBP_QUALITY = 88;

    private const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    public function store(UploadedFile $file, string $disk, string $directory): string
    {
        $sourcePath = $file->getRealPath();
        $mime = $file->getMimeType();
        $size = $file->getSize();

        if (! is_string($sourcePath) || ! in_array($mime, self::ALLOWED_MIME_TYPES, true) || ! is_int($size) || $size > self::MAX_BYTES) {
            throw new RuntimeException('The image could not be processed safely.');
        }

        $dimensions = @getimagesize($sourcePath);
        if (! is_array($dimensions) || ($dimensions[0] * $dimensions[1]) > self::MAX_PIXELS) {
            throw new RuntimeException('The image dimensions are too large.');
        }

        $image = null;
        $temporaryPath = null;
        $storedPath = null;

        try {
            $contents = file_get_contents($sourcePath);
            if ($contents === false || ! function_exists('imagecreatefromstring')) {
                throw new RuntimeException('The image could not be decoded.');
            }

            $image = @imagecreatefromstring($contents);
            if (! $image instanceof \GdImage) {
                throw new RuntimeException('The image could not be decoded.');
            }

            $image = $this->correctOrientation($image, $sourcePath, $mime);
            $image = $this->resize($image);

            $temporaryPath = tempnam(sys_get_temp_dir(), 'dinks-image-');
            if ($temporaryPath === false || ! function_exists('imagewebp') || ! imagewebp($image, $temporaryPath, self::WEBP_QUALITY)) {
                throw new RuntimeException('The image could not be encoded.');
            }

            $storedPath = trim($directory, '/').'/'.Str::uuid().'.webp';
            $stream = fopen($temporaryPath, 'rb');
            if ($stream === false) {
                throw new RuntimeException('The image could not be read for storage.');
            }

            try {
                if (! Storage::disk($disk)->put($storedPath, $stream)) {
                    throw new RuntimeException('The image could not be stored.');
                }
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            return $storedPath;
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk($disk)->delete($storedPath);
            }

            throw $exception;
        } finally {
            if ($image instanceof \GdImage) {
                imagedestroy($image);
            }

            if ($temporaryPath && is_file($temporaryPath)) {
                unlink($temporaryPath);
            }
        }
    }

    private function correctOrientation(\GdImage $image, string $sourcePath, string $mime): \GdImage
    {
        if ($mime !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($sourcePath);
        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;

        if ($orientation === 2) {
            imageflip($image, IMG_FLIP_HORIZONTAL);
        } elseif ($orientation === 3) {
            $image = $this->rotate($image, 180);
        } elseif ($orientation === 4) {
            imageflip($image, IMG_FLIP_VERTICAL);
        } elseif ($orientation === 5) {
            $image = $this->rotate($image, 90);
            imageflip($image, IMG_FLIP_HORIZONTAL);
        } elseif ($orientation === 6) {
            $image = $this->rotate($image, 270);
        } elseif ($orientation === 7) {
            $image = $this->rotate($image, 270);
            imageflip($image, IMG_FLIP_HORIZONTAL);
        } elseif ($orientation === 8) {
            $image = $this->rotate($image, 90);
        }

        return $image;
    }

    private function rotate(\GdImage $image, int $angle): \GdImage
    {
        $rotated = imagerotate($image, $angle, 0);
        if (! $rotated instanceof \GdImage) {
            return $image;
        }

        imagedestroy($image);

        return $rotated;
    }

    private function resize(\GdImage $image): \GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $scale = min(1, self::MAX_DIMENSION / max($width, $height));
        if ($scale >= 1) {
            return $image;
        }

        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        if (! $resized instanceof \GdImage) {
            throw new RuntimeException('The image could not be resized.');
        }

        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);

        return $resized;
    }
}
