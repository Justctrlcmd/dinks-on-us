<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreFaqRequest;
use App\Http\Requests\Management\UpdateFaqOrderRequest;
use App\Http\Requests\Management\UpdateFaqRequest;
use App\Http\Resources\FaqResource;
use App\Models\Faq;
use App\Services\SecurityAuditService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FaqController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $faqs = Faq::query()->inDisplayOrder()->get();

        return $this->respondSuccess(
            FaqResource::collection($faqs)->resolve(),
            'FAQs retrieved.',
        );
    }

    public function store(StoreFaqRequest $request, SecurityAuditService $audit): JsonResponse
    {
        $faq = DB::transaction(function () use ($request): Faq {
            $nextOrder = ((int) Faq::query()->max('display_order')) + 1;

            return Faq::query()->create([
                ...$request->validated(),
                'display_order' => $nextOrder,
                'is_active' => true,
            ]);
        });
        $audit->record('FAQ_CREATED', $request, $request->user(), $faq, module: 'MANAGEMENT_FAQS', targetLabel: $faq->question);

        return $this->respondSuccess(
            FaqResource::make($faq)->resolve($request),
            'FAQ created.',
            201,
        );
    }

    public function update(UpdateFaqRequest $request, Faq $faq, SecurityAuditService $audit): JsonResponse
    {
        $faq->update($request->validated());
        $audit->record('FAQ_UPDATED', $request, $request->user(), $faq, module: 'MANAGEMENT_FAQS', targetLabel: $faq->question);

        return $this->respondSuccess(
            FaqResource::make($faq->fresh())->resolve($request),
            'FAQ updated.',
        );
    }

    public function destroy(Request $request, Faq $faq, SecurityAuditService $audit): JsonResponse
    {
        $label = $faq->question;
        DB::transaction(function () use ($faq): void {
            $faq->delete();

            Faq::query()->inDisplayOrder()->get()->each(
                fn (Faq $remainingFaq, int $index) => $remainingFaq->update(['display_order' => $index + 1]),
            );
        });
        $audit->record('FAQ_DELETED', $request, $request->user(), $faq, module: 'MANAGEMENT_FAQS', targetLabel: $label);

        return $this->respondSuccess(null, 'FAQ deleted.');
    }

    public function updateDisplayOrder(UpdateFaqOrderRequest $request, SecurityAuditService $audit): JsonResponse
    {
        $faqs = DB::transaction(function () use ($request) {
            $ids = array_map('intval', $request->validated('ids'));
            $existingIds = Faq::query()->lockForUpdate()->pluck('id')->map(fn ($id) => (int) $id)->all();

            $submitted = $ids;
            sort($submitted);
            sort($existingIds);

            if ($submitted !== $existingIds) {
                throw ValidationException::withMessages([
                    'ids' => ['The FAQ list changed. Refresh the page and try ordering it again.'],
                ]);
            }

            foreach ($ids as $index => $id) {
                Faq::query()->whereKey($id)->update(['display_order' => $index + 1]);
            }

            return Faq::query()->inDisplayOrder()->get();
        });
        $audit->record('FAQ_ORDER_UPDATED', $request, $request->user(), Faq::class, module: 'MANAGEMENT_FAQS', targetLabel: 'FAQ display order');

        return $this->respondSuccess(
            FaqResource::collection($faqs)->resolve($request),
            'FAQ order updated.',
        );
    }
}
