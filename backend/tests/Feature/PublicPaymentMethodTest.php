<?php

namespace Tests\Feature;

use App\Models\PaymentMethod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicPaymentMethodTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_checkout_can_list_active_payment_methods(): void
    {
        Storage::fake('public');

        PaymentMethod::query()->create([
            'name' => 'GCash',
            'qr_image_path' => 'payment-methods/gcash.png',
            'account_name' => 'Dinks on Us',
            'account_number' => '09123456789',
            'is_active' => true,
        ]);
        PaymentMethod::query()->create([
            'name' => 'BPI',
            'qr_image_path' => 'payment-methods/bpi.png',
            'account_name' => 'Dinks on Us PH',
            'account_number' => '0011223344',
            'is_active' => true,
        ]);
        PaymentMethod::query()->create([
            'name' => 'Archived wallet',
            'qr_image_path' => 'payment-methods/archived.png',
            'account_name' => 'Archived account',
            'account_number' => '0000',
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/public/payment-methods')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'BPI')
            ->assertJsonPath('data.0.account_name', 'Dinks on Us PH')
            ->assertJsonPath('data.0.account_number', '0011223344')
            ->assertJsonPath('data.1.name', 'GCash')
            ->assertJsonMissingPath('data.0.is_active')
            ->assertJsonMissingPath('data.0.created_at')
            ->assertJsonMissing(['name' => 'Archived wallet']);
    }
}
