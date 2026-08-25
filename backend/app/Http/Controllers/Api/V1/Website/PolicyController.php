<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\PolicySectionResource;
use App\Models\PolicySection;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class PolicyController extends Controller
{
    use ApiResponse;

    public function __invoke(): JsonResponse
    {
        $sections = PolicySection::query()
            ->with(['subheaders.rules'])
            ->inDisplayOrder()
            ->get();

        return $this->respondSuccess(
            PolicySectionResource::collection($sections)->resolve(),
            'Policies retrieved.',
        );
    }
}
