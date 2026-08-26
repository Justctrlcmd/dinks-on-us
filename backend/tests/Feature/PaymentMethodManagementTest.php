<?php

namespace Tests\Feature;

use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentMethodManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_manage_payment_methods_and_qr_images(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $created = $this->actingAs($user)
            ->post('/api/v1/management/payment-methods', [
                'name' => '  GCash ',
                'qr_image' => UploadedFile::fake()->image('gcash.png', 600, 600),
                'account_name' => ' Dinks   on Us ',
                'account_number' => '09123456789',
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'GCash')
            ->assertJsonPath('data.account_name', 'Dinks on Us')
            ->assertJsonPath('data.account_number', '09123456789')
            ->assertJsonPath('data.is_active', true)
            ->json('data');

        $paymentMethod = PaymentMethod::query()->findOrFail($created['id']);
        $firstImagePath = $paymentMethod->qr_image_path;
        Storage::disk('public')->assertExists($firstImagePath);

        $this->actingAs($user)
            ->post("/api/v1/management/payment-methods/{$paymentMethod->id}", [
                '_method' => 'PATCH',
                'name' => 'BPI',
                'qr_image' => UploadedFile::fake()->image('bpi.webp', 600, 600),
                'account_name' => 'Dinks on Us PH',
                'account_number' => '0011223344',
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.name', 'BPI')
            ->assertJsonPath('data.account_number', '0011223344');

        $paymentMethod->refresh();
        Storage::disk('public')->assertMissing($firstImagePath);
        Storage::disk('public')->assertExists($paymentMethod->qr_image_path);

        $this->actingAs($user)
            ->deleteJson("/api/v1/management/payment-methods/{$paymentMethod->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Payment method removed.');

        $this->assertDatabaseHas('payment_methods', [
            'id' => $paymentMethod->id,
            'is_active' => false,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/management/payment-methods')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_payment_method_requires_supported_qr_image_under_five_megabytes(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $validFields = [
            'name' => 'GCash',
            'account_name' => 'Dinks on Us',
            'account_number' => '09123456789',
        ];

        $this->actingAs($user)
            ->post('/api/v1/management/payment-methods', $validFields, ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['qr_image']);

        $this->actingAs($user)
            ->post('/api/v1/management/payment-methods', [
                ...$validFields,
                'qr_image' => UploadedFile::fake()->create('qr.gif', 100, 'image/gif'),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.qr_image.0', 'The QR image must be a JPG, PNG, or WebP file.');

        $this->actingAs($user)
            ->post('/api/v1/management/payment-methods', [
                ...$validFields,
                'qr_image' => UploadedFile::fake()->image('qr.png')->size(5121),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.qr_image.0', 'The QR image must not be larger than 5 MB.');
    }

    public function test_payment_method_management_requires_authentication(): void
    {
        $this->getJson('/api/v1/management/payment-methods')->assertUnauthorized();
        $this->postJson('/api/v1/management/payment-methods', [])->assertUnauthorized();
    }
}
