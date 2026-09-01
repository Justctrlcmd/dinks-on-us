<?php

namespace App\Services;

use App\Exceptions\ReservationConflictException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class PaymentProofStorageService
{
    public const DISK = 'local';

    private const DIRECTORY = 'reservation-payment-proofs';

    private const MAX_DIMENSION = 2400;

    private const WEBP_QUALITY = 88;

    public function store(UploadedFile $file): string
    {
        $sourcePath = $file->getRealPath();
        if (! is_string($sourcePath)) {
            throw new ReservationConflictException('The payment proof could not be stored. Please try again.');
        }

        $image = null;
        $temporaryPath = null;
        $storedPath = null;

        try {
            $contents = file_get_contents($sourcePath);
            if ($contents === false || ! function_exists('imagecreatefromstring')) {
                throw new ReservationConflictException('The payment proof could not be stored. Please try again.');
            }

            $image = @imagecreatefromstring($contents);
            if (! $image instanceof \GdImage) {
                throw new ReservationConflictException('The payment proof could not be stored. Please try again.');
            }

            $image = $this->correctOrientation($image, $sourcePath, $file->getMimeType());
            $image = $this->resize($image);

            $temporaryPath = tempnam(sys_get_temp_dir(), 'dinks-payment-proof-');
            if ($temporaryPath === false || ! function_exists('imagewebp') || ! imagewebp($image, $temporaryPath, self::WEBP_QUALITY)) {
                throw new ReservationConflictException('The payment proof could not be stored. Please try again.');
            }

            $storedPath = self::DIRECTORY.'/'.Str::uuid().'.webp';
            $stream = fopen($temporaryPath, 'rb');
            if ($stream === false) {
                throw new ReservationConflictException('The payment proof could not be stored. Please try again.');
            }

            try {
                if (! Storage::disk(self::DISK)->put($storedPath, $stream)) {
                    throw new ReservationConflictException('The payment proof could not be stored. Please try again.');
                }
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            return $storedPath;
        } catch (ReservationConflictException $exception) {
            if ($storedPath) {
                Storage::disk(self::DISK)->delete($storedPath);
            }

            throw $exception;
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk(self::DISK)->delete($storedPath);
            }

            throw new ReservationConflictException('The payment proof could not be stored. Please try again.', previous: $exception);
        } finally {
            if ($image instanceof \GdImage) {
                imagedestroy($image);
            }

            if ($temporaryPath && is_file($temporaryPath)) {
                unlink($temporaryPath);
            }
        }
    }

    public function exists(string $path): bool
    {
        return Storage::disk(self::DISK)->exists($path);
    }

    public function isManagedPath(string $path): bool
    {
        return Str::startsWith($path, self::DIRECTORY.'/')
            && ! Str::contains($path, ['..', '\\']);
    }

    public function size(string $path): int
    {
        return Storage::disk(self::DISK)->size($path);
    }

    public function delete(string $path): bool
    {
        return Storage::disk(self::DISK)->delete($path);
    }

    private function correctOrientation(\GdImage $image, string $sourcePath, ?string $mime): \GdImage
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
            return $image;
        }

        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);

        return $resized;
    }
}
