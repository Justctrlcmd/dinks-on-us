<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StorePolicyRuleRequest;
use App\Http\Requests\Management\StorePolicySubheaderRequest;
use App\Http\Requests\Management\UpdatePolicyRuleOrderRequest;
use App\Http\Requests\Management\UpdatePolicyRuleRequest;
use App\Http\Requests\Management\UpdatePolicySubheaderOrderRequest;
use App\Http\Requests\Management\UpdatePolicySubheaderRequest;
use App\Http\Resources\PolicyRuleResource;
use App\Http\Resources\PolicySectionResource;
use App\Http\Resources\PolicySubheaderResource;
use App\Models\PolicyRule;
use App\Models\PolicySection;
use App\Models\PolicySubheader;
use App\Traits\ApiResponse;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PolicyController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        return $this->respondSuccess(
            PolicySectionResource::collection($this->sections())->resolve(),
            'Policies retrieved.',
        );
    }

    public function storeSubheader(StorePolicySubheaderRequest $request, PolicySection $section): JsonResponse
    {
        $subheader = DB::transaction(function () use ($request, $section): PolicySubheader {
            return $section->subheaders()->create([
                'title' => $request->validated('title'),
                'sort_order' => ((int) $section->subheaders()->max('sort_order')) + 1,
            ]);
        });

        return $this->respondSuccess(PolicySubheaderResource::make($subheader)->resolve($request), 'Sub-header created.', 201);
    }

    public function updateSubheader(UpdatePolicySubheaderRequest $request, PolicySubheader $subheader): JsonResponse
    {
        $subheader->update($request->validated());

        return $this->respondSuccess(PolicySubheaderResource::make($subheader->fresh())->resolve($request), 'Sub-header updated.');
    }

    public function destroySubheader(PolicySubheader $subheader): JsonResponse
    {
        if ($subheader->rules()->exists()) {
            throw ValidationException::withMessages([
                'subheader' => ['This sub-header still contains rules. Move or delete its rules before deleting the sub-header.'],
            ]);
        }

        DB::transaction(function () use ($subheader): void {
            $sectionId = $subheader->policy_section_id;
            $subheader->delete();
            $this->normalizeSubheaderOrder($sectionId);
        });

        return $this->respondSuccess(null, 'Sub-header deleted.');
    }

    public function updateSubheaderOrder(UpdatePolicySubheaderOrderRequest $request, PolicySection $section): JsonResponse
    {
        $subheaders = DB::transaction(function () use ($request, $section) {
            $ids = array_map('intval', $request->validated('ids'));
            $existingIds = $section->subheaders()->lockForUpdate()->pluck('id')->map(fn ($id) => (int) $id)->all();
            $this->assertCompleteOrder($ids, $existingIds, 'The sub-header list changed. Refresh the page and try ordering it again.');

            foreach ($ids as $index => $id) {
                PolicySubheader::query()->whereKey($id)->update(['sort_order' => $index + 1]);
            }

            return $section->subheaders()->with('rules')->get();
        });

        return $this->respondSuccess(PolicySubheaderResource::collection($subheaders)->resolve($request), 'Sub-header order updated.');
    }

    public function storeRule(StorePolicyRuleRequest $request, PolicySection $section): JsonResponse
    {
        $rule = DB::transaction(function () use ($request, $section): PolicyRule {
            $subheader = PolicySubheader::query()
                ->whereKey($request->validated('policy_subheader_id'))
                ->where('policy_section_id', $section->id)
                ->lockForUpdate()
                ->first();

            if (! $subheader) {
                throw ValidationException::withMessages(['policy_subheader_id' => ['Choose a sub-header in this policy section.']]);
            }

            return $subheader->rules()->create([
                'content' => $request->validated('content'),
                'sort_order' => ((int) $subheader->rules()->max('sort_order')) + 1,
            ]);
        });

        return $this->respondSuccess(PolicyRuleResource::make($rule)->resolve($request), 'Rule created.', 201);
    }

    public function updateRule(UpdatePolicyRuleRequest $request, PolicyRule $rule): JsonResponse
    {
        $updated = DB::transaction(function () use ($request, $rule): PolicyRule {
            $rule->load('subheader');
            $target = PolicySubheader::query()->lockForUpdate()->find($request->validated('policy_subheader_id'));

            if (! $target || $target->policy_section_id !== $rule->subheader->policy_section_id) {
                throw ValidationException::withMessages(['policy_subheader_id' => ['Choose a sub-header in the same policy section.']]);
            }

            $previousSubheaderId = $rule->policy_subheader_id;
            $input = ['content' => $request->validated('content'), 'policy_subheader_id' => $target->id];
            if ($previousSubheaderId !== $target->id) {
                $input['sort_order'] = ((int) $target->rules()->max('sort_order')) + 1;
            }
            $rule->update($input);

            if ($previousSubheaderId !== $target->id) {
                $this->normalizeRuleOrder($previousSubheaderId);
            }

            return $rule->fresh();
        });

        return $this->respondSuccess(PolicyRuleResource::make($updated)->resolve($request), 'Rule updated.');
    }

    public function destroyRule(PolicyRule $rule): JsonResponse
    {
        DB::transaction(function () use ($rule): void {
            $subheaderId = $rule->policy_subheader_id;
            $rule->delete();
            $this->normalizeRuleOrder($subheaderId);
        });

        return $this->respondSuccess(null, 'Rule deleted.');
    }

    public function updateRuleOrder(UpdatePolicyRuleOrderRequest $request, PolicySubheader $subheader): JsonResponse
    {
        $rules = DB::transaction(function () use ($request, $subheader) {
            $ids = array_map('intval', $request->validated('ids'));
            $existingIds = $subheader->rules()->lockForUpdate()->pluck('id')->map(fn ($id) => (int) $id)->all();
            $this->assertCompleteOrder($ids, $existingIds, 'The rule list changed. Refresh the page and try ordering it again.');

            foreach ($ids as $index => $id) {
                PolicyRule::query()->whereKey($id)->update(['sort_order' => $index + 1]);
            }

            return $subheader->rules()->get();
        });

        return $this->respondSuccess(PolicyRuleResource::collection($rules)->resolve($request), 'Rule order updated.');
    }

    /** @return Collection<int, PolicySection> */
    private function sections()
    {
        return PolicySection::query()->with(['subheaders.rules'])->inDisplayOrder()->get();
    }

    /** @param list<int> $submitted @param list<int> $existing */
    private function assertCompleteOrder(array $submitted, array $existing, string $message): void
    {
        $orderedSubmitted = $submitted;
        $orderedExisting = $existing;
        sort($orderedSubmitted);
        sort($orderedExisting);

        if ($orderedSubmitted !== $orderedExisting) {
            throw ValidationException::withMessages(['ids' => [$message]]);
        }
    }

    private function normalizeSubheaderOrder(int $sectionId): void
    {
        PolicySubheader::query()->where('policy_section_id', $sectionId)->inDisplayOrder()->get()
            ->each(fn (PolicySubheader $subheader, int $index) => $subheader->update(['sort_order' => $index + 1]));
    }

    private function normalizeRuleOrder(int $subheaderId): void
    {
        PolicyRule::query()->where('policy_subheader_id', $subheaderId)->inDisplayOrder()->get()
            ->each(fn (PolicyRule $rule, int $index) => $rule->update(['sort_order' => $index + 1]));
    }
}
