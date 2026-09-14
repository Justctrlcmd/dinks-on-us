<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
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
}
