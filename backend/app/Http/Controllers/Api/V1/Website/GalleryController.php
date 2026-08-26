<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\GalleryTabResource;
use App\Models\GalleryTab;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GalleryController extends Controller
{
    use ApiResponse;

    public function __invoke(Request $request): JsonResponse
    {
        $tabs = GalleryTab::query()
            ->withCount('images')
            ->with(['images' => fn ($query) => $query->inDisplayOrder()])
            ->inDisplayOrder()
            ->get();

        return $this->respondSuccess(
            GalleryTabResource::collection($tabs)->resolve($request),
            'Gallery retrieved.',
        );
    }
}
