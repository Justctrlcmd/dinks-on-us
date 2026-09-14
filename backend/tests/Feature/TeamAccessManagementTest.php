<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TeamAccessManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_user_can_create_access_and_team_member_with_exact_phone_format(): void
    {
        $manager = User::factory()->create();

        $access = $this->actingAs($manager)
            ->postJson('/api/v1/management/roles', [
                'name' => 'Front Desk',
                'modules' => ['DASHBOARD', 'RESERVATION', 'MANAGEMENT_TEAM_ACCESS'],
                'current_password' => 'password',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Front Desk')
            ->assertJsonPath('data.modules.2', 'MANAGEMENT_TEAM_ACCESS')
            ->json('data');

        $this->actingAs($manager)
            ->postJson('/api/v1/management/staff', [
                'name' => 'Ana Santos',
                'email' => 'ANA@EXAMPLE.COM',
                'contact_number' => '0912345678',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $access['id'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['contact_number']);

        $created = $this->actingAs($manager)
            ->postJson('/api/v1/management/staff', [
                'name' => '  Ana   Santos ',
                'email' => 'ANA@EXAMPLE.COM',
                'contact_number' => '09123456789',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $access['id'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Ana Santos')
            ->assertJsonPath('data.email', 'ana@example.com')
            ->assertJsonPath('data.contact_number', '09123456789')
            ->assertJsonPath('data.is_active', true)
            ->json('data');

        $staff = User::query()->findOrFail($created['id']);
        $this->assertNotNull($staff->email_verified_at);
        $this->assertTrue(Hash::check('password123', $staff->password));

        $this->actingAs($manager)
            ->getJson('/api/v1/management/staff')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['email' => $manager->email]);
    }

    public function test_access_registry_is_enforced_on_existing_management_endpoints(): void
    {
        $allowedRole = Role::factory()->create(['is_full_access' => false]);
        $allowedRole->modules()->create(['module' => 'MANAGEMENT_PAYMENT_METHODS']);
        $allowed = User::factory()->create(['role_id' => $allowedRole->id]);

        $deniedRole = Role::factory()->create(['is_full_access' => false]);
        $deniedRole->modules()->create(['module' => 'DASHBOARD']);
        $denied = User::factory()->create(['role_id' => $deniedRole->id]);

        $this->actingAs($allowed)
            ->getJson('/api/v1/management/payment-methods')
            ->assertOk();

        $this->actingAs($allowed)
            ->getJson('/api/v1/management/roles')
            ->assertForbidden();

        $this->actingAs($denied)
            ->getJson('/api/v1/management/payment-methods')
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');
    }

    public function test_team_access_permission_can_manage_accounts_and_deactivation_blocks_login(): void
    {
        $manager = User::factory()->create();
        $access = Role::factory()->create(['name' => 'Supervisor', 'is_full_access' => false]);
        $access->modules()->create(['module' => 'MANAGEMENT_TEAM_ACCESS']);
        $staff = User::factory()->create([
            'role_id' => $access->id,
            'email' => 'staff@example.com',
            'password' => 'password123',
        ]);

        $this->actingAs($staff)
            ->getJson('/api/v1/management/roles')
            ->assertOk();

        $this->actingAs($manager)
            ->postJson("/api/v1/management/staff/{$staff->id}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->app['auth']->forgetGuards();
        $this->flushSession();

        $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/v1/login', [
            'email' => 'staff@example.com',
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'INVALID_CREDENTIALS');

        $this->actingAs($staff->fresh())
            ->getJson('/api/v1/user')
            ->assertForbidden()
            ->assertJsonPath('code', 'ACCOUNT_INACTIVE');

        $this->actingAs($manager)
            ->postJson("/api/v1/management/staff/{$staff->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->app['auth']->forgetGuards();
        $this->flushSession();

        $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/v1/login', [
            'email' => 'staff@example.com',
            'password' => 'password123',
        ])->assertOk();

        $this->assertNotNull($staff->fresh()->last_login_at);
    }

    public function test_team_member_can_be_soft_deleted_without_losing_historical_identity_or_audit_data(): void
    {
        $manager = User::factory()->create();
        $access = Role::factory()->create(['is_full_access' => false]);
        $access->modules()->create(['module' => 'MANAGEMENT_TEAM_ACCESS']);
        $staff = User::factory()->create([
            'role_id' => $access->id,
            'email' => 'deleted-staff@example.com',
            'password' => 'password123',
        ]);
        $historicalAudit = AuditLog::query()->create([
            'actor_id' => $staff->id,
            'action' => AuditLog::LOGIN_SUCCEEDED,
            'target_type' => User::class,
            'target_id' => (string) $staff->id,
        ]);

        $this->actingAs($manager)
            ->deleteJson("/api/v1/management/staff/{$staff->id}", ['current_password' => 'password'])
            ->assertOk()
            ->assertJsonPath('message', 'Team member deleted. Historical activity remains intact.');

        $this->assertSoftDeleted('users', ['id' => $staff->id]);
        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'email' => 'deleted-staff@example.com',
            'is_active' => false,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditLog::STAFF_DELETED,
            'target_type' => User::class,
            'target_id' => (string) $staff->id,
        ]);
        $this->assertSame(
            'deleted-staff@example.com',
            $historicalAudit->fresh()->user?->email,
        );

        $this->actingAs($manager)
            ->getJson('/api/v1/management/staff')
            ->assertOk()
            ->assertJsonMissing(['email' => 'deleted-staff@example.com']);

        $this->app['auth']->forgetGuards();
        $this->flushSession();

        $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/v1/login', [
            'email' => 'deleted-staff@example.com',
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonPath('code', 'INVALID_CREDENTIALS');
    }

    public function test_protected_or_assigned_access_cannot_be_deleted(): void
    {
        $manager = User::factory()->create();
        $manager->role->update(['is_protected' => true]);

        $this->actingAs($manager)
            ->deleteJson("/api/v1/management/roles/{$manager->role_id}", ['current_password' => 'password'])
            ->assertConflict()
            ->assertJsonPath('code', 'PROTECTED_ACCESS');

        $access = Role::factory()->create(['is_full_access' => false]);
        User::factory()->create(['role_id' => $access->id]);

        $this->actingAs($manager)
            ->deleteJson("/api/v1/management/roles/{$access->id}", ['current_password' => 'password'])
            ->assertConflict()
            ->assertJsonPath('code', 'ACCESS_IN_USE');
    }

    public function test_unknown_access_modules_are_rejected(): void
    {
        $manager = User::factory()->create();

        $this->actingAs($manager)
            ->postJson('/api/v1/management/roles', [
                'name' => 'Unknown Access',
                'modules' => ['MANAGEMENT_UNKNOWN'],
                'current_password' => 'password',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['modules.0']);
    }

    public function test_summary_and_access_cards_exclude_the_protected_manager(): void
    {
        $manager = User::factory()->create();
        $manager->role->update(['name' => 'Manager', 'is_protected' => true, 'is_full_access' => true]);

        $access = Role::factory()->create(['name' => 'Front Desk', 'is_full_access' => false]);
        $access->modules()->create(['module' => 'DASHBOARD']);
        User::factory()->create(['role_id' => $access->id, 'is_active' => true]);
        User::factory()->create(['role_id' => $access->id, 'is_active' => false]);

        $this->actingAs($manager)
            ->getJson('/api/v1/management/roles')
            ->assertOk()
            ->assertJsonCount(1, 'data.accesses')
            ->assertJsonPath('data.accesses.0.name', 'Front Desk')
            ->assertJsonPath('data.summary.total_team', 2)
            ->assertJsonPath('data.summary.active_team', 1)
            ->assertJsonPath('data.summary.inactive_team', 1)
            ->assertJsonPath('data.summary.access_profiles', 1)
            ->assertJsonMissing(['name' => 'Manager']);
    }
}
