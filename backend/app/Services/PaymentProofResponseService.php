<?php

namespace App\Services;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PaymentProofResponseService
{
    public function __construct(private readonly PaymentProofStorageService $storage) {}

    public function display(?string $path): BinaryFileResponse|Response
    {
        abort_unless(
            is_string($path)
                && $this->storage->isManagedPath($path)
                && $this->storage->exists($path),
            404,
        );

        return response()->file(Storage::disk(PaymentProofStorageService::DISK)->path($path), [
            'Cache-Control' => 'private, no-store, max-age=0',
            'Content-Disposition' => 'inline; filename="payment-proof.webp"',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
