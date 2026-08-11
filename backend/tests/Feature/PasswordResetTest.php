<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_always_returns_a_non_enumerating_message(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'jane@example.com']);

        $known = $this->postJson('/api/v1/forgot-password', ['email' => 'jane@example.com']);
        $unknown = $this->postJson('/api/v1/forgot-password', ['email' => 'missing@example.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json('message'), $unknown->json('message'));
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_a_password_can_be_reset_with_a_valid_token(): void
    {
        $user = User::factory()->create();
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/v1/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk()->assertJsonPath('message', 'Your password has been reset.');

        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_an_invalid_reset_token_returns_a_safe_error(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/reset-password', [
            'token' => 'invalid',
            'email' => $user->email,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'INVALID_RESET_TOKEN')
            ->assertJsonMissing(['exception']);
    }
}
