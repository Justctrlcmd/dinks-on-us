<?php

// Run: php tests/Integration/equipment-concurrency.php
// Uses configured MySQL credentials to create/drop ONLY a randomly named test
// database. The application's configured database is never migrated or written.

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
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\Process;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

function useTestDatabase(string $database, string $directory): void
{
    if (! preg_match('/^dinks_equipment_test_[a-f0-9]{12}$/', $database)) {
        throw new RuntimeException('Invalid isolated test database name.');
    }
    config([
        'database.default' => 'mysql',
        'database.connections.mysql.database' => $database,
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
        echo 'accepted';
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
$directory = sys_get_temp_dir().'/'.$database;
$processes = [];
$created = false;
$failed = false;
try {
    // Server connection is used only to create the isolated database.
    DB::connection('mysql')->statement("CREATE DATABASE `{$database}`");
    $created = true;
    mkdir($directory, 0700, true);
    useTestDatabase($database, $directory);
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
        $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source], dirname(__DIR__, 2));
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
        $process = new Process([PHP_BINARY, __FILE__, 'worker', $database, $directory, $source], dirname(__DIR__, 2));
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
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage().PHP_EOL);
    $failed = true;
} finally {
    foreach ($processes as $process) {
        if ($process->isRunning()) {
            $process->stop();
        }
    }
    if ($created) {
        DB::connection('mysql')->statement("DROP DATABASE `{$database}`");
    }
    File::deleteDirectory($directory);
}

exit($failed ? 1 : 0);
