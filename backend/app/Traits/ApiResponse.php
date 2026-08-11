<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function respondSuccess(
        mixed $data = null,
        string $message = 'Request completed successfully.',
        int $status = 200,
        ?array $meta = null,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'code' => null,
            'data' => $data,
            'errors' => null,
            'meta' => $meta,
        ], $status);
    }

    protected function respondFailure(
        string $message,
        string $code,
        int $status,
        ?array $errors = null,
    ): JsonResponse {
        return response()->json([
            'success' => false,
            'message' => $message,
            'code' => $code,
            'data' => null,
            'errors' => $errors,
            'meta' => null,
        ], $status);
    }
}
