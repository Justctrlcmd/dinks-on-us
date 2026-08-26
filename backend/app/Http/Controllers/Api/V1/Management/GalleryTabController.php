<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreGalleryTabRequest;
use App\Http\Requests\Management\UpdateGalleryOrderRequest;
use App\Http\Requests\Management\UpdateGalleryTabRequest;
use App\Http\Resources\GalleryTabResource;
use App\Models\GalleryTab;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class GalleryTabController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $tabs = GalleryTab::query()->withCount('images')->inDisplayOrder()->get();

        return $this->respondSuccess(
            GalleryTabResource::collection($tabs)->resolve($request),
            'Gallery categories retrieved.',
        );
    }

    public function store(StoreGalleryTabRequest $request): JsonResponse
    {
        $tab = DB::transaction(function () use ($request): GalleryTab {
            $nextOrder = ((int) GalleryTab::query()->lockForUpdate()->max('display_order')) + 1;

            return GalleryTab::query()->create([
                'name' => $request->validated('name'),
                'display_order' => $nextOrder,
            ]);
        });

        $tab->loadCount('images');

        return $this->respondSuccess(
            GalleryTabResource::make($tab)->resolve($request),
            'Gallery category created.',
            201,
        );
    }

    public function update(UpdateGalleryTabRequest $request, GalleryTab $galleryTab): JsonResponse
    {
        $galleryTab->update($request->validated());
        $galleryTab = $galleryTab->fresh()->loadCount('images');

        return $this->respondSuccess(
            GalleryTabResource::make($galleryTab)->resolve($request),
            'Gallery category updated.',
        );
    }

    public function destroy(GalleryTab $galleryTab): JsonResponse
    {
        $paths = DB::transaction(function () use ($galleryTab): array {
            $paths = $galleryTab->images()->lockForUpdate()->pluck('image_path')->all();
            $galleryTab->delete();
            $this->resequenceTabs();

            return $paths;
        });

        if ($paths !== []) {
            Storage::disk('public')->delete($paths);
        }

        return $this->respondSuccess(null, 'Gallery category and its images deleted.');
    }

    public function updateDisplayOrder(UpdateGalleryOrderRequest $request): JsonResponse
    {
        $tabs = DB::transaction(function () use ($request) {
            $ids = array_map('intval', $request->validated('ids'));
            $existingIds = GalleryTab::query()->lockForUpdate()->pluck('id')->map(fn ($id) => (int) $id)->all();

            $submitted = $ids;
            sort($submitted);
            sort($existingIds);

            if ($submitted !== $existingIds) {
                throw ValidationException::withMessages([
                    'ids' => ['The category list changed. Refresh the page and try ordering it again.'],
                ]);
            }

            foreach ($ids as $index => $id) {
                GalleryTab::query()->whereKey($id)->update(['display_order' => $index + 1]);
            }

            return GalleryTab::query()->withCount('images')->inDisplayOrder()->get();
        });

        return $this->respondSuccess(
            GalleryTabResource::collection($tabs)->resolve($request),
            'Gallery category order updated.',
        );
    }

    private function resequenceTabs(): void
    {
        GalleryTab::query()->inDisplayOrder()->get()->each(
            fn (GalleryTab $tab, int $index) => $tab->update(['display_order' => $index + 1]),
        );
    }
}
