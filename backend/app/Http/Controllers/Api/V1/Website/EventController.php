<?php

namespace App\Http\Controllers\Api\V1\Website;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $events = Event::query()
            ->published()
            ->newestEventFirst()
            ->paginate($this->perPage($request));

        return $this->respondSuccess(
            EventResource::collection($events->items())->resolve($request),
            'Events retrieved.',
            meta: $this->paginationMeta($events),
        );
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $event = Event::query()->published()->where('slug', $slug)->first();

        if (! $event) {
            return $this->respondFailure('The event could not be found.', 'NOT_FOUND', 404);
        }

        return $this->respondSuccess(
            EventResource::make($event)->resolve($request),
            'Event retrieved.',
        );
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
