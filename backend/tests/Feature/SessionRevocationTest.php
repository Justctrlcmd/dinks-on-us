<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SessionSecurityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SessionRevocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_revocation_rejects_old_remember_tokens_and_preserves_only_the_current_session(): void
    {
        config(['session.driver' => 'database']);
        $user = User::factory()->create(['remember_token' => str_repeat('a', 60)]);
        $other = User::factory()->create(['remember_token' => str_repeat('b', 60)]);
        foreach ([['current', $user->id], ['old', $user->id], ['other', $other->id]] as [$id, $userId]) {
            DB::table('sessions')->insert(['id' => $id, 'user_id' => $userId, 'payload' => '', 'last_activity' => now()->timestamp]);
        }
        $provider = Auth::guard('web')->getProvider();
        $oldToken = $user->remember_token;
        $this->assertNotNull($provider->retrieveByToken($user->id, $oldToken));

        app(SessionSecurityService::class)->invalidate($user, 'current');

        $this->assertNull($provider->retrieveByToken($user->id, $oldToken));
        $this->assertDatabaseHas('sessions', ['id' => 'current']);
        $this->assertDatabaseMissing('sessions', ['id' => 'old']);
        $this->assertDatabaseHas('sessions', ['id' => 'other']);
        $this->assertSame(str_repeat('b', 60), $other->fresh()->remember_token);
    }

    public function test_bulk_role_revocation_rotates_each_remember_token_even_with_a_non_database_driver(): void
    {
        config(['session.driver' => 'array']);
        $users = User::factory()->count(2)->create(['remember_token' => str_repeat('a', 60)]);
        app(SessionSecurityService::class)->invalidateUsers($users->modelKeys());
        $tokens = $users->map(fn (User $user) => $user->fresh()->remember_token);
        $this->assertNotContains(str_repeat('a', 60), $tokens);
        $this->assertCount(2, $tokens->unique());
    }
}
