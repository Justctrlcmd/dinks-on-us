<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreEventRequest;
use App\Http\Requests\Management\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class EventController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $events = Event::query()
            ->activeForManagement()
            ->newestEventFirst()
            ->paginate($this->perPage($request));

        return $this->respondSuccess(
            EventResource::collection($events->items())->resolve($request),
            'Events retrieved.',
            meta: $this->paginationMeta($events),
        );
    }

    public function store(StoreEventRequest $request): JsonResponse
    {
        $imagePath = $request->file('image')->store('events', 'public');
        if (! is_string($imagePath)) {
            throw new RuntimeException('The event image could not be stored.');
        }

        try {
            $event = Event::query()->create([
                ...$request->safe()->except('image'),
                'slug' => $this->uniqueSlug($request->validated('header')),
                'image_path' => $imagePath,
                'status' => Event::STATUS_PUBLISHED,
                'published_at' => now(),
                'created_by_user_id' => $request->user()->id,
            ]);
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($imagePath);
            throw $exception;
        }

        return $this->respondSuccess(
            EventResource::make($event)->resolve($request),
            'Event published.',
            201,
        );
    }

    public function show(Request $request, Event $event): JsonResponse
    {
        return $this->respondSuccess(
            EventResource::make($event)->resolve($request),
            'Event retrieved.',
        );
    }

    public function update(UpdateEventRequest $request, Event $event): JsonResponse
    {
        $newImagePath = $request->hasFile('image')
            ? $request->file('image')->store('events', 'public')
            : null;
        if ($newImagePath === false) {
            throw new RuntimeException('The event image could not be stored.');
        }
        $oldImagePath = $event->image_path;

        try {
            $event->update([
                ...$request->safe()->except('image'),
                ...($newImagePath ? ['image_path' => $newImagePath] : []),
            ]);
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
            EventResource::make($event->fresh())->resolve($request),
            'Event updated.',
        );
    }

    public function destroy(Event $event): JsonResponse
    {
        $event->update(['status' => Event::STATUS_ARCHIVED]);

        return $this->respondSuccess(null, 'Event archived.');
    }

    private function uniqueSlug(string $header): string
    {
        $base = Str::slug($header) ?: 'event';
        $slug = $base;
        $suffix = 2;

        while (Event::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function perPage(Request $request): int
    {
        $requested = (int) $request->query('per_page', 10);

        return in_array($requested, [10, 25, 50, 100], true) ? $requested : 10;
    }

    /** @return array<string, int> */
    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
