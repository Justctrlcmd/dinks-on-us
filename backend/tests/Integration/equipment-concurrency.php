<?php

// Run: php tests/Integration/equipment-concurrency.php
// Uses configured MySQL credentials to create/drop ONLY a randomly named test
// database. --table-prefix is a local-only fallback: use random isolated tables
// in the configured local schema, never migrate/drop its existing tables.

use App\Exceptions\ReservationConflictException;
use App\Models\Court;
use App\Models\CourtConfiguration;
use App\Models\PaymentMethod;
use App\Models\RentalEquipment;
use App\Models\Reservation;
use App\Models\ReservationEmailVerification;
use App\Models\User;
use App\Services\AvailabilityClosureService;
use App\Services\ReservationService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\Process;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$prefixMode = in_array('--table-prefix', $argv, true);
if ($prefixMode && (! app()->environment(['local', 'testing'])
    || ! in_array(config('database.connections.mysql.host'), ['127.0.0.1', 'localhost', '::1'], true)
    || config('database.connections.mysql.url') || config('database.connections.mysql.prefix'))) {
    throw new RuntimeException('Table-prefix tests require an explicit local MySQL connection in local/testing.');
}

function useTestDatabase(string $database, string $directory): void
{
    if (! preg_match('/^dinks_equipment_test_[a-f0-9]{12}$/', $database)) {
        throw new RuntimeException('Invalid isolated test database name.');
    }
    config([
        'database.default' => 'mysql',
        'database.connections.mysql.database' => in_array('--table-prefix', $_SERVER['argv'], true) ? config('database.connections.mysql.database') : $database,
        'database.connections.mysql.prefix' => in_array('--table-prefix', $_SERVER['argv'], true) ? 'dinks_test_'.substr($database, -12).'_' : '',
        'database.connections.mysql.url' => null,
        'filesystems.disks.local.root' => $directory.'/proofs',
        'hashing.driver' => 'argon2id',
        'hashing.argon.memory' => 1024,
        'hashing.argon.time' => 2,
    ]);
    DB::purge('mysql');
    DB::connection('mysql')->statement('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
}

function waitUntil(callable $condition): void
{
    $deadline = microtime(true) + 15;
    while (! $condition()) {
        if (microtime(true) >= $deadline) {
            throw new RuntimeException('Timed out waiting for concurrent workers.');
        }
        usleep(10000);
        clearstatcache();
    }
}

if (($argv[1] ?? '') === 'worker') {
    [, , $database, $directory, $source] = $argv;
    useTestDatabase($database, $directory);
    $fixture = json_decode(file_get_contents($directory.'/fixture.json'), true, flags: JSON_THROW_ON_ERROR);
    try {
        DB::transaction(function () use ($fixture, $directory, $source): void {
            // Deliberately establish an old REPEATABLE READ snapshot before
            // either booking is allowed to commit. Availability must use a
            // current read after waiting for the shared inventory lock.
            Reservation::query()->count();
            file_put_contents($directory.'/'.$source.'.ready', 'ready');
            waitUntil(fn (): bool => file_exists($directory.'/'.$source.'.go'));
            if (str_starts_with($source, 'closer_')) {
                $closures = app(AvailabilityClosureService::class);
                $manager = User::query()->findOrFail($fixture['manager']);
                if ($source === 'closer_entire') {
                    $closures->closeEntireOperation($manager, $fixture['date'], 'Test closure');
                } else {
                    $closures->blockCourtTimes($manager, $fixture['public_court'], $fixture['date'], [['start_hour' => 10, 'end_hour' => 11]], 'Test closure');
                }

                return;
            }
            if ($source === 'ledger_complete') {
                $result = app(ReservationService::class)->complete(Reservation::query()->findOrFail($fixture['reservation']), User::query()->findOrFail($fixture['manager']), null, null, null);
                if ((float) $result->final_amount !== 600.0 || $result->refunds->isNotEmpty() || $result->payments->count() !== 2 || $result->adjustments->count() !== 1) {
                    throw new RuntimeException('Completion used stale ledger rows or returned a stale response.');
                }

                return;
            }
            if ($source === 'pricing_reschedule') {
                app(ReservationService::class)->reschedule(Reservation::query()->findOrFail($fixture['reservation']), User::query()->findOrFail($fixture['manager']), [
                    'slots' => [['court_id' => $fixture['public_court'], 'date' => $fixture['date'], 'start_hour' => 10]],
                    'expected_revision' => $fixture['revision'], 'quoted_amount' => 500, 'quoted_payment_amount' => 0,
                    'idempotency_key' => 'pricing-reschedule-request',
                ]);

                return;
            }
            if (str_starts_with($source, 'staff_refund_')) {
                $result = app(ReservationService::class)->reschedule(Reservation::query()->findOrFail($fixture['reservation']), User::query()->findOrFail($fixture['manager']), [
                    'slots' => [['court_id' => $fixture['public_court'], 'date' => $fixture['date'], 'start_hour' => 10]],
                    'expected_revision' => $fixture['revision'], 'quoted_amount' => 400, 'quoted_payment_amount' => 0,
                    'quoted_refund_amount' => 100, 'refund_settled' => true, 'idempotency_key' => 'same-refund-request-key',
                ]);
                if ($result->netAmountPaid() !== 400.0 || $result->refunds->count() !== 1 || (float) $result->refundable_credit !== 0.0) {
                    throw new RuntimeException('A refund retry returned stale refund or credit data.');
                }
                file_put_contents($directory.'/'.$source.'.result', $result->actionWasReplayed ? 'replayed' : 'applied');

                return;
            }
            if ($source === 'refund_add_on') {
                $result = app(ReservationService::class)->addOns(Reservation::query()->findOrFail($fixture['reservation']), User::query()->findOrFail($fixture['manager']), [
                    'additional_players' => 1, 'payment_channel' => 'CASH',
                ]);
                if ($result->netAmountPaid() !== 500.0 || (float) $result->amount_paid !== 600.0
                    || $result->payments->count() !== 2 || $result->refunds->count() !== 1 || (float) $result->refundable_credit !== 0.0) {
                    throw new RuntimeException('An add-on reused refunded money from a stale snapshot.');
                }

                return;
            }
            if (str_starts_with($source, 'staff_')) {
                $service = app(ReservationService::class);
                $manager = User::query()->findOrFail($fixture['manager']);
                $input = ['additional_players' => 1, 'payment_channel' => 'CASH',
                    'expected_revision' => $fixture['revision'], 'quoted_amount' => 600, 'quoted_payment_amount' => 100,
                    'idempotency_key' => str_starts_with($source, 'staff_replay') ? 'same-staff-request-key' : $source.'-request-key'];
                $result = $service->addOns(Reservation::query()->findOrFail($fixture['reservation']), $manager, $input);
                if ($result->payments->sum('amount') != 600 || $result->currentSlots->count() !== 1) {
                    throw new RuntimeException('A staff result returned stale financial/schedule relations.');
                }
                file_put_contents($directory.'/'.$source.'.result', $result->actionWasReplayed ? 'replayed' : 'applied');

                return;
            }
            $walkIn = in_array($source, ['walk_in', 'closure_walk_in'], true);
            $closureTest = str_starts_with($source, 'closure_');
            $input = [
                'customer_name' => 'Concurrency test', 'customer_email' => 'test@example.com',
                'customer_contact_number' => '09123456789', 'additional_players' => 0,
                'slots' => [['court_id' => $fixture[$walkIn ? 'walk_in_court' : 'public_court'], 'date' => $fixture['date'], 'start_hour' => 10]],
                'equipment' => $closureTest ? [] : [['id' => $fixture['equipment'], 'quantity' => 5]],
                'checkout_key' => $fixture['checkout_key'], 'quoted_amount' => $closureTest ? 500 : 650,
                'payment_channel' => 'CASH', 'payment_method_id' => $fixture['payment'], 'payment_reference_number' => 'TEST',
            ];
            $service = app(ReservationService::class);
            if (! $walkIn) {
                $service->submit($input, UploadedFile::fake()->image('proof.jpg'));
            } else {
                $service->createWalkIn($input, User::query()->findOrFail($fixture['manager']));
            }
        });
        echo str_starts_with($source, 'staff_') ? file_get_contents($directory.'/'.$source.'.result') : 'accepted';
    } catch (ReservationConflictException) {
        echo 'conflict';
    } catch (ValidationException $exception) {
        if (! str_starts_with($source, 'closer_')) {
            throw $exception;
        }
        echo 'closure-conflict';
    }
    exit;
}

$database = 'dinks_equipment_test_'.bin2hex(random_bytes(6));
$tablePrefix = 'dinks_test_'.substr($database, -12).'_';
$directory = sys_get_temp_dir().'/'.$database;
$processes = [];
$created = false;
$directoryCreated = false;
$originalCounts = [];
$failed = false;
try {
    // Prefix mode cannot create/drop databases. Every table is isolated by this
    // random validated prefix; cleanup drops only exact matching physical names.
    if (! $prefixMode) {
        DB::connection('mysql')->statement("CREATE DATABASE `{$database}`");
        $created = true;
    } else {
        foreach (['reservations', 'users'] as $table) {
            if (DB::connection('mysql')->getSchemaBuilder()->hasTable($table)) {
                $originalCounts[$table] = DB::connection('mysql')->table($table)->count();
            }
        }
    }
    if (file_exists($directory)) {
        throw new RuntimeException('The isolated test directory already exists.');
    }
    mkdir($directory, 0700, true);
    $directoryCreated = true;
    useTestDatabase($database, $directory);
    if ($prefixMode) {
        $schema = DB::connection('mysql')->getSchemaBuilder();
        foreach ($schema->getTables() as $table) {
            if (str_starts_with($table['name'], $tablePrefix)) {
                throw new RuntimeException('The isolated test prefix already exists.');
            }
        }
        $created = true;
        // MySQL constraint names are schema-wide and limited to 64 characters.
        // Hash auto-generated names only in the test schema, including the prefix.
        // Existing deployed migrations and application schema are not modified.
        $schema->blueprintResolver(fn ($connection, $table, $callback) => new class($connection, $table, $callback) extends Blueprint
        {
            protected function createIndexName($type, array $columns)
            {
                return 'dinks_test_'.substr(hash('sha256', parent::createIndexName($type, $columns)), 0, 40);
            }
        });
        Schema::swap($schema);
    }
    if (Artisan::call('migrate', ['--database' => 'mysql', '--force' => true]) !== 0) {
        throw new RuntimeException('Could not migrate the isolated database.');
    }
    $manager = User::factory()->create();
    $configuration = CourtConfiguration::query()->create(['opening_hour' => 7, 'closing_hour' => 22, 'included_players_per_court' => 4, 'additional_player_price' => 100]);
    foreach (['weekday', 'weekend'] as $day) {
        $configuration->ratePeriods()->create(['day_type' => $day, 'start_hour' => 7, 'end_hour' => 22, 'price' => 500, 'display_order' => 1]);
    }
    $publicCourt = Court::query()->create(['court_number' => 1, 'is_active' => true]);
    $walkInCourt = Court::query()->create(['court_number' => 2, 'is_active' => true]);
    $equipment = RentalEquipment::query()->create(['name' => 'Ball', 'price' => 30, 'total_quantity' => 5, 'is_active' => true]);
    $payment = PaymentMethod::query()->create(['name' => 'Test', 'qr_image_path' => 'test.png', 'account_name' => 'Test', 'account_number' => '09123456789', 'is_active' => true]);
    $checkoutKey = bin2hex(random_bytes(32));
    ReservationEmailVerification::query()->create([
        'checkout_key_hash' => hash('sha256', $checkoutKey), 'email' => 'test@example.com',
        'verified_at' => now(), 'verification_expires_at' => now()->addMinutes(30),
    ]);
    file_put_contents($directory.'/fixture.json', json_encode([
        'checkout_key' => $checkoutKey,
        'date' => now('Asia/Manila')->addDays(7)->toDateString(), 'manager' => $manager->id,
        'equipment' => $equipment->id, 'payment' => $payment->id,
        'public_court' => $publicCourt->id, 'walk_in_court' => $walkInCourt->id,
    ], JSON_THROW_ON_ERROR));
    foreach (['public', 'walk_in'] as $source) {
        $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source, ...($prefixMode ? ['--table-prefix'] : [])], dirname(__DIR__, 2));
        $process->setTimeout(25);
        $process->start();
        $processes[] = $process;
    }
    waitUntil(fn (): bool => file_exists($directory.'/public.ready') && file_exists($directory.'/walk_in.ready'));
    foreach (['public', 'walk_in'] as $source) {
        file_put_contents($directory.'/'.$source.'.go', 'go');
    }
    $results = [];
    foreach ($processes as $process) {
        $process->wait();
        if (! $process->isSuccessful()) {
            throw new RuntimeException('Concurrent worker failed: '.$process->getOutput().$process->getErrorOutput());
        }
        $results[] = trim($process->getOutput());
    }
    sort($results);
    if ($results !== ['accepted', 'conflict'] || Reservation::query()->count() !== 1 || (int) DB::table('reservation_equipment_items')->sum('quantity') !== 5) {
        throw new RuntimeException('Concurrent submissions did not preserve inventory: '.json_encode($results));
    }
    echo "PASS: MySQL concurrent public/walk-in bookings with stale snapshots: one accepted, one conflict; 5/5 units allocated.\n";

    // A stale reader must observe a closure/reservation committed by another
    // connection before it acquires the corresponding court lock.
    foreach ([
        ['closure_public', 'entire'], ['closure_walk_in', 'entire'],
        ['closure_public', 'court'], ['closure_walk_in', 'court'],
        ['closer_entire', 'booking'], ['closer_court', 'booking'],
    ] as $index => [$source, $committedChange]) {
        $fixture = json_decode(file_get_contents($directory.'/fixture.json'), true, flags: JSON_THROW_ON_ERROR);
        $fixture['date'] = now('Asia/Manila')->addDays(8 + $index)->toDateString();
        $fixture['checkout_key'] = bin2hex(random_bytes(32));
        ReservationEmailVerification::query()->create([
            'checkout_key_hash' => hash('sha256', $fixture['checkout_key']), 'email' => 'test@example.com',
            'verified_at' => now(), 'verification_expires_at' => now()->addMinutes(30),
        ]);
        file_put_contents($directory.'/fixture.json', json_encode($fixture, JSON_THROW_ON_ERROR));
        @unlink($directory.'/'.$source.'.ready');
        @unlink($directory.'/'.$source.'.go');
        $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source, ...($prefixMode ? ['--table-prefix'] : [])], dirname(__DIR__, 2));
        $process->setTimeout(25);
        $process->start();
        $processes[] = $process;
        waitUntil(fn (): bool => file_exists($directory.'/'.$source.'.ready'));

        $courtId = $source === 'closure_walk_in' ? $fixture['walk_in_court'] : $fixture['public_court'];
        if ($committedChange === 'booking') {
            app(ReservationService::class)->createWalkIn([
                'customer_name' => 'Concurrent closure test', 'customer_email' => 'test@example.com',
                'customer_contact_number' => '09123456789', 'additional_players' => 0,
                'slots' => [['court_id' => $courtId, 'date' => $fixture['date'], 'start_hour' => 10]],
                'equipment' => [], 'payment_channel' => 'CASH',
            ], $manager);
        } elseif ($committedChange === 'entire') {
            app(AvailabilityClosureService::class)->closeEntireOperation($manager, $fixture['date'], 'Test closure');
        } else {
            app(AvailabilityClosureService::class)->blockCourtTimes($manager, $courtId, $fixture['date'], [['start_hour' => 10, 'end_hour' => 11]], 'Test closure');
        }
        file_put_contents($directory.'/'.$source.'.go', 'go');
        $process->wait();
        $expected = $committedChange === 'booking' ? 'closure-conflict' : 'conflict';
        if (! $process->isSuccessful() || trim($process->getOutput()) !== $expected) {
            throw new RuntimeException("Stale snapshot {$source}/{$committedChange} failed: ".$process->getOutput().$process->getErrorOutput());
        }
        echo "PASS: MySQL stale snapshot {$source} observes committed {$committedChange}.\n";
    }
    foreach (['replay', 'stale'] as $scenario) {
        $fixture = json_decode(file_get_contents($directory.'/fixture.json'), true, flags: JSON_THROW_ON_ERROR);
        $fixture['date'] = now('Asia/Manila')->addDays($scenario === 'replay' ? 30 : 31)->toDateString();
        $reservation = app(ReservationService::class)->createWalkIn([
            'customer_name' => 'Staff concurrency', 'customer_email' => 'test@example.com',
            'customer_contact_number' => '09123456789', 'additional_players' => 0, 'equipment' => [], 'payment_channel' => 'CASH',
            'slots' => [['court_id' => $fixture['public_court'], 'date' => $fixture['date'], 'start_hour' => 9]],
        ], $manager);
        $fixture['reservation'] = $reservation->id;
        $fixture['revision'] = $reservation->revision;
        file_put_contents($directory.'/fixture.json', json_encode($fixture, JSON_THROW_ON_ERROR));
        $pair = [];
        foreach (['a', 'b'] as $suffix) {
            $source = 'staff_'.$scenario.'_'.$suffix;
            $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source, ...($prefixMode ? ['--table-prefix'] : [])], dirname(__DIR__, 2));
            $process->setTimeout(25);
            $process->start();
            $processes[] = $process;
            $pair[$source] = $process;
        }
        waitUntil(fn (): bool => collect(array_keys($pair))->every(fn ($source): bool => file_exists($directory.'/'.$source.'.ready')));
        foreach ($pair as $source => $process) {
            file_put_contents($directory.'/'.$source.'.go', 'go');
        }
        $outcomes = [];
        foreach ($pair as $process) {
            $process->wait();
            if (! $process->isSuccessful()) {
                throw new RuntimeException('Staff concurrency worker failed: '.$process->getErrorOutput().$process->getOutput());
            }
            $outcomes[] = trim($process->getOutput());
        }
        sort($outcomes);
        $expected = $scenario === 'replay' ? ['applied', 'replayed'] : ['applied', 'conflict'];
        if ($outcomes !== $expected || (float) $reservation->fresh()->amount_paid !== 600.0
            || $reservation->adjustments()->count() !== 1 || $reservation->payments()->count() !== 2) {
            throw new RuntimeException('Staff '.$scenario.' did not preserve one purchase: '.implode(', ', $outcomes));
        }
        echo "PASS: MySQL simultaneous staff {$scenario} applies exactly one purchase.\n";
    }
    $fixture = json_decode(file_get_contents($directory.'/fixture.json'), true, flags: JSON_THROW_ON_ERROR);
    $fixture['date'] = now('Asia/Manila')->addDays(35)->toDateString();
    $reservation = app(ReservationService::class)->createWalkIn([
        'customer_name' => 'Pricing concurrency', 'customer_email' => 'test@example.com',
        'customer_contact_number' => '09123456789', 'additional_players' => 0, 'equipment' => [], 'payment_channel' => 'CASH',
        'slots' => [['court_id' => $fixture['public_court'], 'date' => $fixture['date'], 'start_hour' => 9]],
    ], $manager);
    $fixture['reservation'] = $reservation->id;
    $fixture['revision'] = $reservation->revision;
    file_put_contents($directory.'/fixture.json', json_encode($fixture, JSON_THROW_ON_ERROR));
    $source = 'pricing_reschedule';
    $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source, ...($prefixMode ? ['--table-prefix'] : [])], dirname(__DIR__, 2));
    $process->setTimeout(25);
    $process->start();
    $processes[] = $process;
    waitUntil(fn (): bool => file_exists($directory.'/'.$source.'.ready'));
    DB::transaction(function (): void {
        $configuration = CourtConfiguration::query()->lockForUpdate()->findOrFail(1);
        $configuration->ratePeriods()->update(['price' => 600]);
    });
    file_put_contents($directory.'/'.$source.'.go', 'go');
    $process->wait();
    if (! $process->isSuccessful() || trim($process->getOutput()) !== 'conflict'
        || $reservation->currentSlots()->first()->start_hour !== 9 || (float) $reservation->fresh()->amount_paid !== 500.0) {
        throw new RuntimeException('Rescheduling did not reject a newly committed price: '.$process->getOutput().$process->getErrorOutput());
    }
    echo "PASS: MySQL reschedule rejects a stale quote after a committed rate change.\n";
    CourtConfiguration::query()->findOrFail(1)->ratePeriods()->update(['price' => 500]);
    $fixture['date'] = now('Asia/Manila')->addDays(36)->toDateString();
    $reservation = app(ReservationService::class)->createWalkIn([
        'customer_name' => 'Ledger concurrency', 'customer_email' => 'test@example.com',
        'customer_contact_number' => '09123456789', 'additional_players' => 0, 'equipment' => [], 'payment_channel' => 'CASH',
        'slots' => [['court_id' => $fixture['public_court'], 'date' => $fixture['date'], 'start_hour' => 9]],
    ], $manager);
    CarbonImmutable::withTestNow(CarbonImmutable::parse($fixture['date'].' 08:00:00', 'Asia/Manila'), fn () => app(ReservationService::class)->start($reservation, $manager));
    $fixture['reservation'] = $reservation->id;
    file_put_contents($directory.'/fixture.json', json_encode($fixture, JSON_THROW_ON_ERROR));
    $source = 'ledger_complete';
    $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source, ...($prefixMode ? ['--table-prefix'] : [])], dirname(__DIR__, 2));
    $process->setTimeout(25);
    $process->start();
    $processes[] = $process;
    waitUntil(fn (): bool => file_exists($directory.'/'.$source.'.ready'));
    app(ReservationService::class)->addOns($reservation, $manager, ['additional_players' => 1, 'payment_channel' => 'CASH']);
    file_put_contents($directory.'/'.$source.'.go', 'go');
    $process->wait();
    if (! $process->isSuccessful() || trim($process->getOutput()) !== 'accepted'
        || $reservation->refunds()->count() !== 0 || (float) $reservation->fresh()->final_amount !== 600.0) {
        throw new RuntimeException('Completion lost a committed add-on: '.$process->getOutput().$process->getErrorOutput());
    }
    echo "PASS: MySQL completion retains committed add-ons and returns a current ledger.\n";
    foreach (['refund_replay', 'refund_add_on'] as $scenario) {
        CourtConfiguration::query()->findOrFail(1)->ratePeriods()->update(['price' => 500]);
        $fixture['date'] = now('Asia/Manila')->addDays($scenario === 'refund_replay' ? 37 : 38)->toDateString();
        $reservation = app(ReservationService::class)->createWalkIn([
            'customer_name' => 'Refund concurrency', 'customer_email' => 'test@example.com',
            'customer_contact_number' => '09123456789', 'additional_players' => 0, 'equipment' => [], 'payment_channel' => 'CASH',
            'slots' => [['court_id' => $fixture['public_court'], 'date' => $fixture['date'], 'start_hour' => 9]],
        ], $manager);
        $fixture['reservation'] = $reservation->id;
        $fixture['revision'] = $reservation->revision;
        file_put_contents($directory.'/fixture.json', json_encode($fixture, JSON_THROW_ON_ERROR));
        $sources = $scenario === 'refund_replay' ? ['staff_refund_a', 'staff_refund_b'] : ['refund_add_on'];
        $pair = [];
        foreach ($sources as $source) {
            $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source, ...($prefixMode ? ['--table-prefix'] : [])], dirname(__DIR__, 2));
            $process->setTimeout(25);
            $process->start();
            $processes[] = $process;
            $pair[$source] = $process;
        }
        waitUntil(fn (): bool => collect($sources)->every(fn ($source): bool => file_exists($directory.'/'.$source.'.ready')));
        CourtConfiguration::query()->findOrFail(1)->ratePeriods()->update(['price' => 400]);
        if ($scenario === 'refund_add_on') {
            app(ReservationService::class)->reschedule($reservation, $manager, [
                'slots' => [['court_id' => $fixture['public_court'], 'date' => $fixture['date'], 'start_hour' => 10]],
                'quoted_refund_amount' => 100, 'refund_settled' => true,
            ]);
        }
        foreach ($pair as $source => $process) {
            file_put_contents($directory.'/'.$source.'.go', 'go');
        }
        $outcomes = [];
        foreach ($pair as $process) {
            $process->wait();
            if (! $process->isSuccessful()) {
                throw new RuntimeException('Refund worker failed: '.$process->getOutput().$process->getErrorOutput());
            }
            $outcomes[] = trim($process->getOutput());
        }
        sort($outcomes);
        $expected = $scenario === 'refund_replay' ? ['applied', 'replayed'] : ['accepted'];
        if ($outcomes !== $expected || $reservation->refunds()->count() !== 1) {
            throw new RuntimeException('Refund concurrency did not preserve one refund: '.implode(', ', $outcomes));
        }
        echo "PASS: MySQL {$scenario} preserves one settled refund and current available funds.\n";
    }
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage().PHP_EOL);
    $failed = true;
} finally {
    foreach ($processes as $process) {
        if ($process->isRunning()) {
            $process->stop();
        }
    }
    if ($created && $prefixMode) {
        $connection = DB::connection('mysql');
        $connection->statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            foreach ($connection->getSchemaBuilder()->getTables() as $table) {
                $name = $table['name'];
                if (str_starts_with($name, $tablePrefix) && preg_match('/^dinks_test_[a-f0-9]{12}_[a-z0-9_]+$/', $name)) {
                    $connection->statement("DROP TABLE `{$name}`");
                }
            }
        } finally {
            $connection->statement('SET FOREIGN_KEY_CHECKS=1');
        }
    } elseif ($created) {
        DB::connection('mysql')->statement("DROP DATABASE `{$database}`");
    }
    if ($directoryCreated) {
        File::deleteDirectory($directory);
    }
    if ($prefixMode) {
        foreach ($originalCounts as $table => $count) {
            $current = (int) DB::connection('mysql')->selectOne("SELECT COUNT(*) AS total FROM `{$table}`")->total;
            if ($current !== $count) {
                fwrite(STDERR, "Existing application row counts changed during isolation test.\n");
                $failed = true;
            }
        }
    }
}

exit($failed ? 1 : 0);
