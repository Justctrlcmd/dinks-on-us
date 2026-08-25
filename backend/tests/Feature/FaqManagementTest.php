<?php

namespace Tests\Feature;

use App\Models\Faq;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FaqManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_manage_faqs(): void
    {
        $user = User::factory()->create();

        $created = $this->actingAs($user)
            ->postJson('/api/v1/management/faqs', [
                'question' => '  Can I bring   my own paddle? ',
                'answer' => " Yes.\r\nPlease label it. ",
            ])
            ->assertCreated()
            ->assertJsonPath('data.question', 'Can I bring my own paddle?')
            ->assertJsonPath('data.answer', "Yes.\nPlease label it.")
            ->assertJsonPath('data.display_order', 1)
            ->json('data');

        $this->actingAs($user)
            ->patchJson("/api/v1/management/faqs/{$created['id']}", [
                'question' => 'Do you rent paddles?',
                'answer' => 'Rental availability will be shown during reservation.',
            ])
            ->assertOk()
            ->assertJsonPath('data.question', 'Do you rent paddles?');

        $this->actingAs($user)
            ->deleteJson("/api/v1/management/faqs/{$created['id']}")
            ->assertOk()
            ->assertJsonPath('message', 'FAQ deleted.');

        $this->assertDatabaseEmpty('faqs');
    }

    public function test_faq_input_is_validated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/management/faqs', ['question' => '', 'answer' => ''])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'VALIDATION_FAILED')
            ->assertJsonValidationErrors(['question', 'answer']);
    }

    public function test_faqs_can_be_reordered_and_public_faqs_follow_the_saved_order(): void
    {
        $user = User::factory()->create();
        $first = Faq::query()->create(['question' => 'First?', 'answer' => 'First answer.', 'display_order' => 1, 'is_active' => true]);
        $second = Faq::query()->create(['question' => 'Second?', 'answer' => 'Second answer.', 'display_order' => 2, 'is_active' => false]);
        $third = Faq::query()->create(['question' => 'Third?', 'answer' => 'Third answer.', 'display_order' => 3, 'is_active' => true]);

        $this->actingAs($user)
            ->patchJson('/api/v1/management/faqs/display-order', [
                'ids' => [$third->id, $first->id, $second->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $third->id)
            ->assertJsonPath('data.1.id', $first->id)
            ->assertJsonPath('data.2.id', $second->id);

        $this->getJson('/api/v1/public/faqs')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $third->id)
            ->assertJsonPath('data.1.id', $first->id);
    }

    public function test_reordering_requires_the_complete_current_faq_list(): void
    {
        $user = User::factory()->create();
        $first = Faq::query()->create(['question' => 'First?', 'answer' => 'First answer.', 'display_order' => 1]);
        Faq::query()->create(['question' => 'Second?', 'answer' => 'Second answer.', 'display_order' => 2]);

        $this->actingAs($user)
            ->patchJson('/api/v1/management/faqs/display-order', ['ids' => [$first->id]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.ids.0', 'The FAQ list changed. Refresh the page and try ordering it again.');
    }

    public function test_management_faq_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/management/faqs')
            ->assertUnauthorized()
            ->assertJsonPath('code', 'UNAUTHENTICATED');

        $this->postJson('/api/v1/management/faqs', [
            'question' => 'Question?',
            'answer' => 'Answer.',
        ])->assertUnauthorized();
    }
}
