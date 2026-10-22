<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_self_service_account_routes_are_not_available(): void
    {
        foreach (['register', 'forgot-password', 'reset-password'] as $endpoint) {
            $this->postJson("/api/v1/{$endpoint}")->assertNotFound();
        }
    }

    public function test_a_user_can_login_and_retrieve_their_account(): void
    {
        $user = User::factory()->create(['password' => 'password123']);

        $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/v1/login', [
            'email' => strtoupper($user->email),
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('data.id', $user->id);

        $this->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_a_legacy_bcrypt_password_is_accepted_and_upgraded_to_argon2id(): void
    {
        $legacyHash = password_hash('password123', PASSWORD_BCRYPT, ['cost' => 4]);
        $user = User::factory()->create();
        DB::table('users')->where('id', $user->id)->update(['password' => $legacyHash]);

        $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk();

        $this->assertSame('argon2id', password_get_info($user->fresh()->password)['algoName']);
    }

    public function test_invalid_login_does_not_reveal_which_credential_failed(): void
    {
        User::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/v1/login', [
            'email' => 'jane@example.com',
            'password' => 'incorrect-password',
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'INVALID_CREDENTIALS')
            ->assertJsonPath('errors.email.0', 'The email or password is incorrect.');

        $failure = AuditLog::query()->where('action', AuditLog::LOGIN_FAILED)->sole();
        $this->assertSame(hash_hmac('sha256', 'jane@example.com', (string) config('app.key')), $failure->after['account_fingerprint']);
        $this->assertStringNotContainsString('jane@example.com', $failure->toJson());
        $this->assertStringNotContainsString('incorrect-password', $failure->toJson());
    }

    public function test_an_existing_session_receives_json_instead_of_a_login_redirect(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->withHeader('Origin', 'http://localhost:3000')
            ->post('/api/v1/login')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/json')
            ->assertHeaderMissing('Location')
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.role.id', $user->role_id);

        $this->assertNull($user->fresh()->last_login_at);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_a_stale_login_form_does_not_switch_an_existing_session_to_another_account(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create(['password' => 'another-password']);

        $this->actingAs($user, 'web')
            ->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/v1/login', [
                'email' => $other->email,
                'password' => 'another-password',
            ])->assertOk()->assertJsonPath('data.id', $user->id);

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_an_inactive_existing_session_is_rejected_and_logged_out(): void
    {
        $user = User::factory()->create(['is_active' => false]);

        $this->actingAs($user, 'web')
            ->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/v1/login')
            ->assertForbidden()
            ->assertHeaderMissing('Location')
            ->assertJsonPath('code', 'ACCOUNT_INACTIVE')
            ->assertJsonPath('data', null);

        $this->assertGuest('web');
    }

    public function test_guest_login_still_requires_credentials_and_rejects_malformed_email_safely(): void
    {
        $this->postJson('/api/v1/login')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);

        $this->postJson('/api/v1/login', [
            'email' => ['unexpected-array'],
            'password' => 'password123',
        ])->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_FAILED');

        $this->assertGuest('web');
    }

    public function test_a_user_can_logout(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withHeader('Origin', 'http://localhost:3000')
            ->postJson('/api/v1/logout')
            ->assertOk()
            ->assertJsonPath('message', 'You have been signed out.');
    }

    public function test_local_database_seeder_creates_the_default_manager(): void
    {
        $this->seed();

        $manager = User::query()
            ->with('role')
            ->where('email', config('manager.default.email'))
            ->firstOrFail();

        $this->assertSame(config('manager.default.name'), $manager->name);
        $this->assertSame('manager', $manager->role?->slug);
        $this->assertTrue($manager->role?->is_protected);
        $this->assertTrue($manager->role?->is_full_access);
        $this->assertNotNull($manager->email_verified_at);
        $this->assertTrue(Hash::check(config('manager.default.password'), $manager->password));
    }

    public function test_guest_access_to_account_endpoints_returns_401(): void
    {
        foreach (['/api/v1/user', '/api/v1/profile'] as $endpoint) {
            $this->getJson($endpoint)
                ->assertUnauthorized()
                ->assertJsonPath('code', 'UNAUTHENTICATED');
        }
    }
}
