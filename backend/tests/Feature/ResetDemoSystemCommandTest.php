<?php

namespace Tests\Feature;

use App\Models\Court;
use App\Models\Event;
use App\Models\Faq;
use App\Models\GalleryImage;
use App\Models\GalleryTab;
use App\Models\PaymentMethod;
use App\Models\Role;
use App\Models\User;
use Illuminate\Contracts\Foundation\MaintenanceMode;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Mockery;
use Tests\TestCase;

class ResetDemoSystemCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_requires_force_before_removing_any_data(): void
    {
        User::factory()->create();

        $this->artisan('system:reset-demo')
            ->expectsOutputToContain('permanently deletes all application data')
            ->assertExitCode(1);

        $this->assertSame(1, User::query()->count());
    }

    public function test_it_removes_application_data_and_recreates_only_the_configured_manager(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        config()->set('manager.default', [
            'name' => 'Reset Manager',
            'email' => 'reset-manager@example.test',
            'password' => 'ResetManager2026!',
        ]);

        $role = Role::factory()->create();
        $user = User::factory()->create(['role_id' => $role->id]);
        $softDeletedUser = User::factory()->create(['role_id' => $role->id]);
        $softDeletedUser->delete();
        Court::query()->create(['court_number' => 1, 'is_active' => true]);
        $tab = GalleryTab::query()->create(['name' => 'Demo', 'display_order' => 1]);
        GalleryImage::query()->create([
            'gallery_tab_id' => $tab->id,
            'image_path' => 'gallery/demo.webp',
            'alt_text' => 'Demo image',
            'display_order' => 1,
            'uploaded_by_user_id' => $user->id,
        ]);
        Event::query()->create([
            'header' => 'Demo event',
            'slug' => 'demo-event',
            'description' => 'Demo event description',
            'image_path' => 'events/demo.webp',
            'event_date' => '2026-10-01',
            'created_by_user_id' => $user->id,
        ]);
        PaymentMethod::query()->create([
            'name' => 'Demo payment',
            'qr_image_path' => 'payment-methods/demo.webp',
            'account_name' => 'Demo account',
            'account_number' => '123456',
        ]);
        Faq::query()->create(['question' => 'Demo?', 'answer' => 'Yes.', 'display_order' => 1]);
        DB::table('audit_logs')->insert(['action' => 'DEMO_ACTION', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('sessions')->insert(['id' => 'demo-session', 'user_id' => $user->id, 'payload' => 'payload', 'last_activity' => now()->timestamp]);
        DB::table('password_reset_tokens')->insert(['email' => $user->email, 'token' => 'token', 'created_at' => now()]);
        Storage::disk('local')->put('reservation-payment-proofs/demo.webp', 'proof');
        Storage::disk('public')->put('events/demo.webp', 'event');
        Storage::disk('public')->put('gallery/demo.webp', 'gallery');
        Storage::disk('public')->put('payment-methods/demo.webp', 'payment');

        $this->artisan('system:reset-demo --force')
            ->expectsOutputToContain('Reset complete')
            ->assertExitCode(0);

        $this->assertSame(1, User::withTrashed()->count());
        $manager = User::query()->sole();
        $this->assertSame('Reset Manager', $manager->name);
        $this->assertSame('reset-manager@example.test', $manager->email);
        $this->assertTrue(Hash::check('ResetManager2026!', $manager->password));
        $this->assertTrue($manager->is_active);
        $this->assertNotNull($manager->email_verified_at);
        $this->assertSame('manager', $manager->role->slug);
        $this->assertTrue($manager->role->is_protected);
        $this->assertTrue($manager->role->is_full_access);
        $this->assertSame(1, Role::query()->count());

        foreach (['courts', 'events', 'faqs', 'gallery_images', 'gallery_tabs', 'payment_methods', 'audit_logs', 'sessions', 'password_reset_tokens', 'policy_sections'] as $table) {
            $this->assertSame(0, DB::table($table)->count(), "{$table} should be empty after reset.");
        }

        Storage::disk('local')->assertMissing('reservation-payment-proofs/demo.webp');
        Storage::disk('public')->assertMissing('events/demo.webp');
        Storage::disk('public')->assertMissing('gallery/demo.webp');
        Storage::disk('public')->assertMissing('payment-methods/demo.webp');
    }

    public function test_production_reset_requires_maintenance_mode(): void
    {
        $this->app['env'] = 'production';
        $this->app->instance(MaintenanceMode::class, Mockery::mock(MaintenanceMode::class, ['active' => false]));

        config()->set('manager.default', [
            'name' => 'Prod Manager',
            'email' => 'prod@example.com',
            'password' => 'ProdPassword2026!',
        ]);

        User::factory()->create();

        $this->artisan('system:reset-demo --force')
            ->expectsOutputToContain('maintenance mode')
            ->assertExitCode(1);

        $this->assertSame(1, User::query()->count());
    }

    public function test_production_reset_rejects_wrong_confirmation_phrase(): void
    {
        $this->app['env'] = 'production';
        $this->app->instance(MaintenanceMode::class, Mockery::mock(MaintenanceMode::class, ['active' => true]));

        config()->set('manager.default', [
            'name' => 'Prod Manager',
            'email' => 'prod@example.com',
            'password' => 'ProdPassword2026!',
        ]);

        User::factory()->create();

        $this->artisan('system:reset-demo --force')
            ->expectsQuestion('Type WIPE DINKS ON US PRODUCTION to continue', 'WRONG PHRASE')
            ->expectsOutputToContain('Confirmation phrase did not match')
            ->assertExitCode(1);

        $this->assertSame(1, User::query()->count());
    }

    public function test_production_reset_recreates_the_configured_default_manager_credentials(): void
    {
        $this->app['env'] = 'production';
        $this->app->instance(MaintenanceMode::class, Mockery::mock(MaintenanceMode::class, ['active' => true]));
        Storage::fake('local');
        Storage::fake('public');

        config()->set('manager.default', [
            'name' => 'Dinks on Us Manager',
            'email' => 'manager@dinksonus.test',
            'password' => 'DinksManager2026!',
        ]);

        $this->artisan('system:reset-demo --force')
            ->expectsQuestion('Type WIPE DINKS ON US PRODUCTION to continue', 'WIPE DINKS ON US PRODUCTION')
            ->expectsOutputToContain('Reset complete')
            ->assertExitCode(0);

        $this->assertSame(1, User::query()->count());
        $manager = User::query()->sole();
        $this->assertSame('manager@dinksonus.test', $manager->email);
        $this->assertTrue(Hash::check('DinksManager2026!', $manager->password));
    }

    public function test_file_cleanup_failure_aborts_before_database_wipe(): void
    {
        config()->set('manager.default', [
            'name' => 'Reset Manager',
            'email' => 'reset-manager@example.test',
            'password' => 'ResetManager2026!',
        ]);

        $role = Role::factory()->create();
        User::factory()->create(['role_id' => $role->id]);

        $failingAdapter = Mockery::mock(FilesystemAdapter::class);
        $failingAdapter->shouldReceive('allFiles')->andReturn([]);
        $failingAdapter->shouldReceive('deleteDirectory')->andReturn(false);
        Storage::shouldReceive('disk')->andReturn($failingAdapter);

        $this->artisan('system:reset-demo --force')
            ->expectsOutputToContain('did not complete')
            ->assertExitCode(1);

        $this->assertSame(1, User::query()->count());
        $this->assertSame(1, Role::query()->count());
    }

    public function test_reset_works_on_empty_database(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        config()->set('manager.default', [
            'name' => 'Fresh Manager',
            'email' => 'fresh@example.test',
            'password' => 'FreshPassword2026!',
        ]);

        $this->artisan('system:reset-demo --force')
            ->expectsOutputToContain('Reset complete')
            ->assertExitCode(0);

        $this->assertSame(1, User::query()->count());
        $manager = User::query()->sole();
        $this->assertSame('fresh@example.test', $manager->email);
        $this->assertTrue(Hash::check('FreshPassword2026!', $manager->password));
        $this->assertSame('manager', $manager->role->slug);
        $this->assertTrue($manager->role->is_protected);
        $this->assertTrue($manager->role->is_full_access);
        $this->assertSame(1, Role::query()->count());
    }

    public function test_soft_deleted_users_are_purged(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        config()->set('manager.default', [
            'name' => 'Reset Manager',
            'email' => 'reset-manager@example.test',
            'password' => 'ResetManager2026!',
        ]);

        $role = Role::factory()->create();
        for ($i = 0; $i < 3; $i++) {
            $user = User::factory()->create(['role_id' => $role->id]);
            $user->delete();
        }
        User::factory()->create(['role_id' => $role->id]);

        $this->assertSame(4, User::withTrashed()->count());
        $this->assertSame(1, User::query()->count());

        $this->artisan('system:reset-demo --force')
            ->expectsOutputToContain('Reset complete')
            ->assertExitCode(0);

        $this->assertSame(1, User::withTrashed()->count());
        $this->assertSame('reset-manager@example.test', User::query()->sole()->email);
    }

    public function test_reset_logs_summary(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        config()->set('manager.default', [
            'name' => 'Reset Manager',
            'email' => 'reset-manager@example.test',
            'password' => 'ResetManager2026!',
        ]);

        User::factory()->create();

        Log::shouldReceive('warning')
            ->once()
            ->with(
                'System demo data reset completed from Artisan.',
                Mockery::on(fn (array $data) => $data['environment'] === 'testing'
                    && $data['manager_email'] === 'reset-manager@example.test'
                    && isset($data['removed_record_count'])
                    && isset($data['removed_file_count']))
            );

        $this->artisan('system:reset-demo --force')
            ->assertExitCode(0);
    }
}
