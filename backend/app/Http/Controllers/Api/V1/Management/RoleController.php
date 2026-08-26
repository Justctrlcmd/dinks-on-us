<?php

namespace App\Http\Controllers\Api\V1\Management;

use App\Http\Controllers\Controller;
use App\Http\Requests\Management\StoreRoleRequest;
use App\Http\Requests\Management\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->where('is_protected', false)
            ->where('is_full_access', false)
            ->with('modules')
            ->withCount('users')
            ->orderBy('name')
            ->get();

        $team = User::query()
            ->whereHas('role', fn ($query) => $query->where('is_protected', false)->where('is_full_access', false));

        $modules = collect(config('access.modules', []))
            ->map(fn (array $details, string $key): array => ['key' => $key, ...$details])
            ->values()
            ->all();

        return $this->respondSuccess([
            'accesses' => RoleResource::collection($roles)->resolve(),
            'modules' => $modules,
            'summary' => [
                'total_team' => (clone $team)->count(),
                'active_team' => (clone $team)->where('is_active', true)->count(),
                'inactive_team' => (clone $team)->where('is_active', false)->count(),
                'access_profiles' => $roles->count(),
            ],
        ], 'Access profiles retrieved.');
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = DB::transaction(function () use ($request): Role {
            $role = Role::query()->create([
                'name' => $request->validated('name'),
                'slug' => $this->uniqueSlug($request->validated('name')),
                'description' => null,
                'is_protected' => false,
                'is_full_access' => false,
            ]);

            $role->modules()->createMany(
                collect($request->validated('modules'))->map(fn (string $module): array => ['module' => $module])->all(),
            );

            return $role->load('modules')->loadCount('users');
        });

        return $this->respondSuccess(
            RoleResource::make($role)->resolve($request),
            'Access profile added.',
            201,
        );
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        if ($role->is_protected || $role->is_full_access) {
            return $this->respondFailure(
                'The protected Manager Access cannot be changed.',
                'PROTECTED_ACCESS',
                409,
            );
        }

        DB::transaction(function () use ($request, $role): void {
            $role->update(['name' => $request->validated('name')]);
            $role->modules()->delete();
            $role->modules()->createMany(
                collect($request->validated('modules'))->map(fn (string $module): array => ['module' => $module])->all(),
            );
        });

        return $this->respondSuccess(
            RoleResource::make($role->fresh()->load('modules')->loadCount('users'))->resolve($request),
            'Access profile updated.',
        );
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->is_protected || $role->is_full_access) {
            return $this->respondFailure(
                'The protected Manager Access cannot be deleted.',
                'PROTECTED_ACCESS',
                409,
            );
        }

        if ($role->users()->exists()) {
            return $this->respondFailure(
                'Reassign every Team member using this Access before deleting it.',
                'ACCESS_IN_USE',
                409,
            );
        }

        $role->delete();

        return $this->respondSuccess(null, 'Access profile deleted.');
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'access';
        $slug = $base;
        $suffix = 2;

        while (Role::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
