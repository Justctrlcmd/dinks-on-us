<?php

namespace App\Services;

use App\Exceptions\ReservationConflictException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

class PaymentProofStorageService
{
    public const DISK = 'local';

    private const DIRECTORY = 'reservation-payment-proofs';

    public function __construct(private readonly OptimizedImageStorageService $images) {}

    public function store(UploadedFile $file): string
    {
        try {
            return $this->images->store($file, self::DISK, self::DIRECTORY);
        } catch (Throwable $exception) {
            throw new ReservationConflictException('The payment proof could not be stored. Please try again.', previous: $exception);
        }
    }

    public function exists(string $path): bool
    {
        return Storage::disk(self::DISK)->exists($path);
    }

    public function isManagedPath(string $path): bool
    {
        return str_starts_with($path, self::DIRECTORY.'/')
            && ! str_contains($path, '..')
            && ! str_contains($path, '\\');
    }

    public function size(string $path): int
    {
        return Storage::disk(self::DISK)->size($path);
    }

    public function delete(string $path): bool
    {
        return Storage::disk(self::DISK)->delete($path);
    }
}
