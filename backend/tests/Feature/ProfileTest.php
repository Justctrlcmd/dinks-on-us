<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_team_accounts_cannot_access_or_change_their_profile_or_password(): void
    {
        Notification::fake();
        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'MANAGEMENT_TEAM_ACCESS']);
        $user = User::factory()->create(['role_id' => $role->id, 'password' => 'old-password']);
        $original = $user->only(['name', 'email', 'contact_number', 'password', 'email_verified_at']);

        $this->actingAs($user)->getJson('/api/v1/user')->assertOk();
        $this->getJson('/api/v1/profile')->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');

        $profile = ['name' => 'Changed Name', 'email' => 'changed@example.com', 'contact_number' => '09987654321', 'role_id' => $role->id];
        $password = ['current_password' => 'old-password', 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123'];
        $this->patchJson('/api/v1/profile', $profile)->assertForbidden();
        $this->putJson('/api/v1/password', $password)->assertForbidden();
        $this->patchJson("/api/v1/management/staff/{$user->id}", $profile)->assertForbidden();
        $this->putJson("/api/v1/management/staff/{$user->id}/password", $password)->assertForbidden();

        $this->assertEquals($original, $user->fresh()->only(array_keys($original)));
        Notification::assertNothingSent();

        $this->app['auth']->forgetGuards();
        $manager = User::factory()->create();
        $this->actingAs($manager, 'web')->patchJson("/api/v1/management/staff/{$user->id}", $profile)->assertOk();
        $this->putJson("/api/v1/management/staff/{$user->id}/password", [
            ...$password,
            'current_password' => 'password',
        ])->assertOk();
        $this->assertSame('changed@example.com', $user->fresh()->email);
        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_guests_cannot_change_profile_or_password(): void
    {
        $this->patchJson('/api/v1/profile', [])->assertUnauthorized();
        $this->putJson('/api/v1/password', [])->assertUnauthorized();
    }

    public function test_a_full_access_manager_can_view_their_profile(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/v1/profile')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_a_user_can_update_their_profile(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->patchJson('/api/v1/profile', [
                'name' => '  Updated   Name ',
                'email' => ' UPDATED@EXAMPLE.COM ',
            ])->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.email', 'updated@example.com')
            ->assertJsonPath('data.email_verified_at', null);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_a_user_can_change_their_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);

        $this->actingAs($user)
            ->putJson('/api/v1/password', [
                'current_password' => 'old-password',
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])->assertOk();

        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_an_incorrect_current_password_uses_field_validation(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);

        $this->actingAs($user)
            ->putJson('/api/v1/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])->assertUnprocessable()
            ->assertJsonPath('errors.current_password.0', 'The current password is incorrect.');
    }
}
