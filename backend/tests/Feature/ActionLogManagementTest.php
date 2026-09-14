<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActionLogManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_roles_can_read_safe_operational_and_security_logs(): void
    {
        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'ACTION_LOGS']);
        $user = User::factory()->create(['role_id' => $role->id, 'name' => 'Ari Manager']);

        AuditLog::query()->create([
            'actor_id' => $user->id,
            'actor_name' => 'Ari Manager',
            'action' => 'FAQ_CREATED',
            'module' => 'MANAGEMENT_FAQS',
            'target_type' => 'faq',
            'target_id' => '9',
            'after' => ['answer' => 'This must not be returned.'],
        ]);
        AuditLog::query()->create([
            'action' => AuditLog::RESERVATION_SUBMITTED,
            'target_label' => 'Customer reservation',
        ]);
        AuditLog::query()->create([
            'action' => AuditLog::LOGIN_FAILED,
            'target_label' => 'Failed login attempt',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/management/action-logs?module=MANAGEMENT_FAQS')
            ->assertOk()
            ->assertJsonPath('data.0.actor_name', 'Ari Manager')
            ->assertJsonPath('data.0.action_label', 'Faq created')
            ->assertJsonPath('data.0.target_label', 'Record #9')
            ->assertJsonMissing(['answer' => 'This must not be returned.']);

        $this->actingAs($user)
            ->getJson('/api/v1/management/action-logs')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_roles_without_the_module_cannot_read_action_logs(): void
    {
        $role = Role::factory()->create(['is_full_access' => false]);
        $role->modules()->create(['module' => 'DASHBOARD']);
        $user = User::factory()->create(['role_id' => $role->id]);

        $this->actingAs($user)
            ->getJson('/api/v1/management/action-logs')
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');
    }

    public function test_action_logs_can_be_filtered_to_a_business_date_and_default_to_ten_per_page(): void
    {
        $user = User::factory()->create(['name' => 'Ari Manager']);
        $insideDate = AuditLog::query()->forceCreate([
            'actor_id' => $user->id,
            'actor_name' => $user->name,
            'action' => 'FAQ_CREATED',
            'module' => 'MANAGEMENT_FAQS',
            'target_label' => 'Inside selected date',
            'created_at' => CarbonImmutable::parse('2026-09-13 16:30:00', 'UTC'),
            'updated_at' => CarbonImmutable::parse('2026-09-13 16:30:00', 'UTC'),
        ]);
        AuditLog::query()->forceCreate([
            'actor_id' => $user->id,
            'actor_name' => $user->name,
            'action' => 'FAQ_UPDATED',
            'module' => 'MANAGEMENT_FAQS',
            'target_label' => 'Outside selected date',
            'created_at' => CarbonImmutable::parse('2026-09-14 16:00:00', 'UTC'),
            'updated_at' => CarbonImmutable::parse('2026-09-14 16:00:00', 'UTC'),
        ]);

        for ($index = 0; $index < 10; $index++) {
            AuditLog::query()->forceCreate([
                'actor_id' => $user->id,
                'actor_name' => $user->name,
                'action' => 'FAQ_UPDATED',
                'module' => 'MANAGEMENT_FAQS',
                'target_label' => "Additional log {$index}",
                'created_at' => CarbonImmutable::parse('2026-09-13 16:31:00', 'UTC')->addSeconds($index),
                'updated_at' => CarbonImmutable::parse('2026-09-13 16:31:00', 'UTC')->addSeconds($index),
            ]);
        }

        $this->actingAs($user)
            ->getJson('/api/v1/management/action-logs?date=2026-09-14')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 11)
            ->assertJsonMissing(['target_label' => 'Outside selected date']);

        $this->assertDatabaseHas('audit_logs', ['id' => $insideDate->id]);
    }
}
