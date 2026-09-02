<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class SessionSecurityService
{
    public function invalidate(User $user, ?string $exceptSessionId = null): void
    {
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
        if (config('session.driver') !== 'database') {
            return;
        }

        $ids = collect($userIds)->map(static fn ($id): int => (int) $id)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return;
        }

        DB::table(config('session.table', 'sessions'))->whereIn('user_id', $ids)->delete();
    }
}
