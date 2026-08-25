<?php

namespace Tests\Feature;

use App\Models\PolicySection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_four_fixed_sections_are_seeded_and_returned_in_public_order(): void
    {
        $this->assertDatabaseCount('policy_sections', 4);

        $this->getJson('/api/v1/public/policies')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'court-rules')
            ->assertJsonPath('data.1.slug', 'reservation-rules')
            ->assertJsonPath('data.2.slug', 'reschedule-policy')
            ->assertJsonPath('data.3.slug', 'cancellation-policy')
            ->assertJsonPath('data.0.subheaders.0.sort_order', 1)
            ->assertJsonPath('data.0.subheaders.0.rules.0.sort_order', 1);
    }

    public function test_an_authenticated_user_can_manage_subheaders_and_rules(): void
    {
        $user = User::factory()->create();
        $court = PolicySection::query()->where('slug', 'court-rules')->firstOrFail();

        $subheader = $this->actingAs($user)->postJson("/api/v1/management/policy-sections/{$court->id}/subheaders", [
            'title' => '  New   court details ',
        ])->assertCreated()->assertJsonPath('data.title', 'New court details')->json('data');

        $this->actingAs($user)->patchJson("/api/v1/management/policy-subheaders/{$subheader['id']}", [
            'title' => 'Updated court details',
        ])->assertOk()->assertJsonPath('data.title', 'Updated court details');

        $rule = $this->actingAs($user)->postJson("/api/v1/management/policy-sections/{$court->id}/rules", [
            'policy_subheader_id' => $subheader['id'],
            'content' => " A new rule.\r\nPlease follow it. ",
        ])->assertCreated()->assertJsonPath('data.content', "A new rule.\nPlease follow it.")->json('data');

        $target = $court->subheaders()->firstOrFail();
        $this->actingAs($user)->patchJson("/api/v1/management/policy-rules/{$rule['id']}", [
            'policy_subheader_id' => $target->id,
            'content' => 'Moved rule.',
        ])->assertOk()->assertJsonPath('data.policy_subheader_id', $target->id);

        $this->actingAs($user)->deleteJson("/api/v1/management/policy-rules/{$rule['id']}")
            ->assertOk()->assertJsonPath('message', 'Rule deleted.');
        $this->actingAs($user)->deleteJson("/api/v1/management/policy-subheaders/{$subheader['id']}")
            ->assertOk()->assertJsonPath('message', 'Sub-header deleted.');
    }

    public function test_a_non_empty_subheader_cannot_be_deleted_and_rules_cannot_move_between_sections(): void
    {
        $user = User::factory()->create();
        $court = PolicySection::query()->where('slug', 'court-rules')->firstOrFail();
        $reservation = PolicySection::query()->where('slug', 'reservation-rules')->firstOrFail();
        $subheader = $court->subheaders()->with('rules')->firstOrFail();
        $rule = $subheader->rules->firstOrFail();

        $this->actingAs($user)->deleteJson("/api/v1/management/policy-subheaders/{$subheader->id}")
            ->assertUnprocessable()
            ->assertJsonPath('errors.subheader.0', 'This sub-header still contains rules. Move or delete its rules before deleting the sub-header.');

        $this->actingAs($user)->patchJson("/api/v1/management/policy-rules/{$rule->id}", [
            'policy_subheader_id' => $reservation->subheaders()->firstOrFail()->id,
            'content' => $rule->content,
        ])->assertUnprocessable()->assertJsonValidationErrors('policy_subheader_id');
    }

    public function test_subheader_and_rule_ordering_require_the_full_owned_list_and_persist(): void
    {
        $user = User::factory()->create();
        $court = PolicySection::query()->where('slug', 'court-rules')->firstOrFail();
        $subheaders = $court->subheaders()->get();
        $ids = $subheaders->pluck('id')->reverse()->values()->all();

        $this->actingAs($user)->patchJson("/api/v1/management/policy-sections/{$court->id}/subheader-order", ['ids' => $ids])
            ->assertOk()->assertJsonPath('data.0.id', $ids[0]);
        $this->getJson('/api/v1/public/policies')->assertOk()->assertJsonPath('data.0.subheaders.0.id', $ids[0]);
        $this->actingAs($user)->patchJson("/api/v1/management/policy-sections/{$court->id}/subheader-order", ['ids' => [$ids[0]]])
            ->assertUnprocessable()->assertJsonValidationErrors('ids');

        $subheader = $court->subheaders()->with('rules')->firstOrFail();
        $ruleIds = $subheader->rules->pluck('id')->reverse()->values()->all();
        $this->actingAs($user)->patchJson("/api/v1/management/policy-subheaders/{$subheader->id}/rule-order", ['ids' => $ruleIds])
            ->assertOk()->assertJsonPath('data.0.id', $ruleIds[0]);
    }

    public function test_policy_management_requires_authentication_and_rejects_invalid_relationships(): void
    {
        $court = PolicySection::query()->where('slug', 'court-rules')->firstOrFail();
        $reservation = PolicySection::query()->where('slug', 'reservation-rules')->firstOrFail();

        $this->getJson('/api/v1/management/policy-sections')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');
        $this->postJson("/api/v1/management/policy-sections/{$court->id}/rules", ['policy_subheader_id' => 1, 'content' => 'Rule.'])->assertUnauthorized();

        $this->actingAs(User::factory()->create())->postJson("/api/v1/management/policy-sections/{$court->id}/rules", [
            'policy_subheader_id' => $reservation->subheaders()->firstOrFail()->id,
            'content' => 'Rule.',
        ])->assertUnprocessable()->assertJsonValidationErrors('policy_subheader_id');
    }
}
