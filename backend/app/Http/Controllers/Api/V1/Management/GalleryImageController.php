<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\ListGalleryImagesRequest;
use App\Http\Requests\Management\StoreGalleryImageRequest;
use App\Http\Requests\Management\UpdateGalleryImageRequest;
use App\Http\Requests\Management\UpdateGalleryOrderRequest;
use App\Http\Resources\GalleryImageResource;
use App\Models\GalleryImage;
use App\Models\GalleryTab;
use App\Services\OptimizedImageStorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class GalleryImageController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly OptimizedImageStorageService $images) {}

    public function index(ListGalleryImagesRequest $request): JsonResponse
    {
        $images = GalleryImage::query()
            ->where('gallery_tab_id', $request->validated('gallery_tab_id'))
            ->inDisplayOrder()
            ->get();

        return $this->respondSuccess(
            GalleryImageResource::collection($images)->resolve($request),
            'Gallery images retrieved.',
        );
    }

    public function store(StoreGalleryImageRequest $request): JsonResponse
    {
        $imagePath = $this->images->store($request->file('image'), 'public', 'gallery');

        try {
            $image = DB::transaction(function () use ($request, $imagePath): GalleryImage {
                $tabId = (int) $request->validated('gallery_tab_id');
                $nextOrder = ((int) GalleryImage::query()
                    ->where('gallery_tab_id', $tabId)
                    ->lockForUpdate()
                    ->max('display_order')) + 1;

                return GalleryImage::query()->create([
                    'gallery_tab_id' => $tabId,
                    'image_path' => $imagePath,
                    'alt_text' => $request->validated('alt_text'),
                    'display_order' => $nextOrder,
                    'uploaded_by_user_id' => $request->user()->id,
                ]);
            });
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($imagePath);
            throw $exception;
        }

        return $this->respondSuccess(
            GalleryImageResource::make($image)->resolve($request),
            'Gallery image added.',
            201,
        );
    }

    public function update(UpdateGalleryImageRequest $request, GalleryImage $galleryImage): JsonResponse
    {
        $newImagePath = $request->hasFile('image')
            ? $this->images->store($request->file('image'), 'public', 'gallery')
            : null;

        $oldImagePath = $galleryImage->image_path;
        $sourceTabId = $galleryImage->gallery_tab_id;
        $destinationTabId = (int) $request->validated('gallery_tab_id');

        try {
            DB::transaction(function () use ($request, $galleryImage, $newImagePath, $sourceTabId, $destinationTabId): void {
                $displayOrder = $galleryImage->display_order;

                if ($destinationTabId !== $sourceTabId) {
                    $displayOrder = ((int) GalleryImage::query()
                        ->where('gallery_tab_id', $destinationTabId)
                        ->lockForUpdate()
                        ->max('display_order')) + 1;
                }

                $galleryImage->update([
                    'gallery_tab_id' => $destinationTabId,
                    'alt_text' => $request->validated('alt_text'),
                    'display_order' => $displayOrder,
                    ...($newImagePath ? ['image_path' => $newImagePath] : []),
                ]);

                if ($destinationTabId !== $sourceTabId) {
                    $this->resequenceImages($sourceTabId);
                }
            });
        } catch (Throwable $exception) {
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }
            throw $exception;
        }

        if ($newImagePath) {
            Storage::disk('public')->delete($oldImagePath);
        }

        return $this->respondSuccess(
            GalleryImageResource::make($galleryImage->fresh())->resolve($request),
            'Gallery image updated.',
        );
    }

    public function destroy(GalleryImage $galleryImage): JsonResponse
    {
        $imagePath = $galleryImage->image_path;
        $tabId = $galleryImage->gallery_tab_id;

        DB::transaction(function () use ($galleryImage, $tabId): void {
            $galleryImage->delete();
            $this->resequenceImages($tabId);
        });

        Storage::disk('public')->delete($imagePath);

        return $this->respondSuccess(null, 'Gallery image deleted.');
    }

    public function updateDisplayOrder(
        UpdateGalleryOrderRequest $request,
        GalleryTab $galleryTab,
    ): JsonResponse {
        $images = DB::transaction(function () use ($request, $galleryTab) {
            $ids = array_map('intval', $request->validated('ids'));
            $existingIds = $galleryTab->images()->lockForUpdate()->pluck('id')->map(fn ($id) => (int) $id)->all();

            $submitted = $ids;
            sort($submitted);
            sort($existingIds);

            if ($submitted !== $existingIds) {
                throw ValidationException::withMessages([
                    'ids' => ['The image list changed. Refresh the page and try ordering it again.'],
                ]);
            }

            foreach ($ids as $index => $id) {
                GalleryImage::query()
                    ->where('gallery_tab_id', $galleryTab->id)
                    ->whereKey($id)
                    ->update(['display_order' => $index + 1]);
            }

            return $galleryTab->images()->inDisplayOrder()->get();
        });

        return $this->respondSuccess(
            GalleryImageResource::collection($images)->resolve($request),
            'Gallery image order updated.',
        );
    }

    private function resequenceImages(int $tabId): void
    {
        GalleryImage::query()
            ->where('gallery_tab_id', $tabId)
            ->inDisplayOrder()
            ->get()
            ->each(fn (GalleryImage $image, int $index) => $image->update(['display_order' => $index + 1]));
    }
}
