<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use App\Services\PaymentProofStorageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class ResetDemoSystemCommand extends Command
{
    protected $signature = 'system:reset-demo
        {--force : Confirm that all application data should be permanently removed}';

    protected $description = 'Permanently remove all application data and recreate only the configured Manager account';

    /** @var list<string> */
    private const RESET_TABLES = [
        'reservation_slot_locks',
        'reservation_refunds',
        'reservation_schedule_histories',
        'reservation_status_histories',
        'reservation_adjustments',
        'reservation_equipment_items',
        'reservation_payments',
        'reservation_slots',
        'reservations',
        'availability_closure_periods',
        'availability_closures',
        'audit_logs',
        'gallery_images',
        'gallery_tabs',
        'events',
        'faqs',
        'payment_methods',
        'policy_rules',
        'policy_subheaders',
        'policy_sections',
        'court_rate_periods',
        'court_configurations',
        'rental_equipment',
        'courts',
        'push_subscriptions',
        'sessions',
        'password_reset_tokens',
        'role_modules',
        'users',
        'roles',
    ];

    /** @var list<array{disk: string, directory: string}> */
    private const MANAGED_DIRECTORIES = [
        ['disk' => PaymentProofStorageService::DISK, 'directory' => 'reservation-payment-proofs'],
        ['disk' => 'public', 'directory' => 'events'],
        ['disk' => 'public', 'directory' => 'gallery'],
        ['disk' => 'public', 'directory' => 'payment-methods'],
    ];

    public function handle(): int
    {
        if (! $this->option('force')) {
            $this->error('This command permanently deletes all application data. Re-run it with --force after reviewing the target environment.');

            return self::FAILURE;
        }

        if (! $this->confirmProductionReset()) {
            return self::FAILURE;
        }

        try {
            $manager = $this->managerConfiguration();
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
        $counts = $this->recordCounts();
        $fileCount = $this->managedFileCount();

        $this->warn(sprintf(
            'Resetting %s: %d database records and %d managed files will be permanently removed.',
            app()->environment(),
            array_sum($counts),
            $fileCount,
        ));

        try {
            $this->deleteManagedFiles();

            [$role, $user] = DB::transaction(function () use ($manager): array {
                foreach (self::RESET_TABLES as $table) {
                    DB::table($table)->delete();
                }

                $role = Role::query()->create([
                    'name' => 'Manager',
                    'slug' => 'manager',
                    'description' => 'Full access to all management modules.',
                    'is_protected' => true,
                    'is_full_access' => true,
                ]);

                $user = User::query()->create([
                    'role_id' => $role->id,
                    'name' => $manager['name'],
                    'email' => $manager['email'],
                    'password' => $manager['password'],
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]);

                return [$role, $user];
            });
        } catch (Throwable $exception) {
            report($exception);
            $this->error('The reset did not complete. Review the application log before attempting it again.');

            return self::FAILURE;
        }

        Log::warning('System demo data reset completed from Artisan.', [
            'environment' => app()->environment(),
            'removed_record_count' => array_sum($counts),
            'removed_file_count' => $fileCount,
            'manager_id' => $user->id,
            'manager_email' => $user->email,
        ]);

        $this->info("Reset complete. Only the protected Manager account ({$user->email}) remains.");

        return self::SUCCESS;
    }

    private function confirmProductionReset(): bool
    {
        if (! app()->isProduction()) {
            return true;
        }

        if (! app()->isDownForMaintenance()) {
            $this->error('Production resets require maintenance mode. Run php artisan down first.');

            return false;
        }

        if (! $this->input->isInteractive()) {
            $this->error('Production resets require an interactive terminal and an exact confirmation phrase.');

            return false;
        }

        $phrase = 'WIPE DINKS ON US PRODUCTION';
        $entered = (string) $this->ask("Type {$phrase} to continue");

        if (! hash_equals($phrase, $entered)) {
            $this->error('Confirmation phrase did not match. No data was removed.');

            return false;
        }

        return true;
    }

    /** @return array{name: string, email: string, password: string} */
    private function managerConfiguration(): array
    {
        $manager = config('manager.default');
        $name = trim((string) ($manager['name'] ?? ''));
        $email = trim((string) ($manager['email'] ?? ''));
        $password = (string) ($manager['password'] ?? '');

        if ($name === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            throw new RuntimeException('Manager credentials must be configured before resetting the system.');
        }

        if (app()->isProduction() && ($email === 'manager@dinksonus.test' || $password === 'DinksManager2026!')) {
            throw new RuntimeException('Production resets require non-default Manager credentials.');
        }

        return compact('name', 'email', 'password');
    }

    /** @return array<string, int> */
    private function recordCounts(): array
    {
        return collect(self::RESET_TABLES)
            ->mapWithKeys(fn (string $table): array => [$table => DB::table($table)->count()])
            ->all();
    }

    private function managedFileCount(): int
    {
        return collect(self::MANAGED_DIRECTORIES)
            ->sum(fn (array $location): int => count(Storage::disk($location['disk'])->allFiles($location['directory'])));
    }

    private function deleteManagedFiles(): void
    {
        foreach (self::MANAGED_DIRECTORIES as $location) {
            if (! Storage::disk($location['disk'])->deleteDirectory($location['directory'])) {
                throw new RuntimeException("Unable to remove managed {$location['directory']} files.");
            }
        }
    }
}
