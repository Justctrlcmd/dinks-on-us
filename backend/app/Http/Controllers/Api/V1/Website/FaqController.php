<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\FaqResource;
use App\Models\Faq;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class FaqController extends Controller
{
    use ApiResponse;

    public function __invoke(): JsonResponse
    {
        $faqs = Faq::query()
            ->where('is_active', true)
            ->inDisplayOrder()
            ->get();

        return $this->respondSuccess(
            FaqResource::collection($faqs)->resolve(),
            'FAQs retrieved.',
        );
    }
}
