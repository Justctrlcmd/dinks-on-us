<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_without_a_role_or_permission(): void
    {
        Notification::fake();

        $response = $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/v1/register', [
            'name' => '  Jane   Doe  ',
            'email' => ' JANE@EXAMPLE.COM ',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Jane Doe')
            ->assertJsonPath('data.email', 'jane@example.com')
            ->assertJsonMissingPath('data.role')
            ->assertJsonMissingPath('data.permissions');

        $user = User::query()->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('password123', $user->password));
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_registration_validation_uses_the_standard_contract(): void
    {
        $this->postJson('/api/v1/register', [])
            ->assertUnprocessable()
            ->assertJson([
                'success' => false,
                'message' => 'The provided information is invalid.',
                'code' => 'VALIDATION_FAILED',
                'data' => null,
                'meta' => null,
            ])
            ->assertJsonValidationErrors(['name', 'email', 'password'], 'errors');
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

    public function test_invalid_login_does_not_reveal_which_credential_failed(): void
    {
        User::factory()->create(['email' => 'jane@example.com']);

        $this->postJson('/api/v1/login', [
            'email' => 'jane@example.com',
            'password' => 'incorrect-password',
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'INVALID_CREDENTIALS')
            ->assertJsonPath('errors.email.0', 'The email or password is incorrect.');
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

    public function test_guest_access_to_account_endpoints_returns_401(): void
    {
        foreach (['/api/v1/user', '/api/v1/profile'] as $endpoint) {
            $this->getJson($endpoint)
                ->assertUnauthorized()
                ->assertJsonPath('code', 'UNAUTHENTICATED');
        }
    }
}
