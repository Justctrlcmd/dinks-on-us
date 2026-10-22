<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SessionSecurityService
{
    public function invalidate(User $user, ?string $exceptSessionId = null): void
    {
        // Deleted sessions must not be restored by an old remember-me cookie.
        $user->forceFill(['remember_token' => Str::random(60)])->saveQuietly();

        if (config('session.driver') !== 'database') {
            return;
        }

        $query = DB::table(config('session.table', 'sessions'))->where('user_id', $user->id);

        if ($exceptSessionId) {
            $query->where('id', '!=', $exceptSessionId);
        }

        $query->delete();
    }

    /** @param iterable<int, int|string> $userIds */
    public function invalidateUsers(iterable $userIds): void
    {
        $ids = collect($userIds)->map(static fn ($id): int => (int) $id)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return;
        }

        User::query()->whereIn('id', $ids)->eachById(function (User $user): void {
            $user->forceFill(['remember_token' => Str::random(60)])->saveQuietly();
        });

        if (config('session.driver') !== 'database') {
            return;
        }

        DB::table(config('session.table', 'sessions'))->whereIn('user_id', $ids)->delete();
    }
}
