<?php

namespace Tests\Feature;

use App\Models\GalleryImage;
use App\Models\GalleryTab;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class GalleryManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authorized_user_can_manage_order_and_publish_gallery_content(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $services = $this->actingAs($user)
            ->postJson('/api/v1/management/gallery-tabs', ['name' => '  Services  '])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Services')
            ->assertJsonPath('data.display_order', 1)
            ->json('data');

        $interior = $this->actingAs($user)
            ->postJson('/api/v1/management/gallery-tabs', ['name' => 'Interior'])
            ->assertCreated()
            ->assertJsonPath('data.display_order', 2)
            ->json('data');

        $first = $this->actingAs($user)
            ->post('/api/v1/management/gallery', [
                'gallery_tab_id' => $services['id'],
                'alt_text' => '  Players enjoying a friendly rally  ',
                'image' => UploadedFile::fake()->image('rally.jpg', 800, 600),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.alt_text', 'Players enjoying a friendly rally')
            ->assertJsonPath('data.display_order', 1)
            ->json('data');

        $firstPath = GalleryImage::query()->findOrFail($first['id'])->image_path;
        Storage::disk('public')->assertExists($firstPath);

        $this->actingAs($user)
            ->patchJson('/api/v1/management/gallery-tabs/display-order', [
                'ids' => [$interior['id'], $services['id']],
            ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $interior['id'])
            ->assertJsonPath('data.1.id', $services['id']);

        $this->actingAs($user)
            ->patchJson("/api/v1/management/gallery-tabs/{$services['id']}", ['name' => 'Services & Play'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Services & Play');

        $this->actingAs($user)
            ->post("/api/v1/management/gallery/{$first['id']}", [
                '_method' => 'PATCH',
                'gallery_tab_id' => $interior['id'],
                'alt_text' => 'Interior court-side view',
                'image' => UploadedFile::fake()->image('interior.webp', 800, 600),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.gallery_tab_id', $interior['id'])
            ->assertJsonPath('data.display_order', 1);

        $moved = GalleryImage::query()->findOrFail($first['id']);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($moved->image_path);

        $second = $this->actingAs($user)
            ->post('/api/v1/management/gallery', [
                'gallery_tab_id' => $interior['id'],
                'alt_text' => 'Wide interior court view',
                'image' => UploadedFile::fake()->image('wide.png', 800, 600),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.display_order', 2)
            ->json('data');

        $this->actingAs($user)
            ->patchJson("/api/v1/management/gallery-tabs/{$interior['id']}/image-order", [
                'ids' => [$second['id'], $first['id']],
            ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second['id'])
            ->assertJsonPath('data.1.id', $first['id']);

        $this->getJson('/api/v1/public/gallery')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Interior')
            ->assertJsonPath('data.0.images.0.id', $second['id'])
            ->assertJsonPath('data.0.images.1.id', $first['id'])
            ->assertJsonPath('data.1.name', 'Services & Play');

        $paths = GalleryImage::query()->where('gallery_tab_id', $interior['id'])->pluck('image_path')->all();

        $this->actingAs($user)
            ->deleteJson("/api/v1/management/gallery-tabs/{$interior['id']}")
            ->assertOk()
            ->assertJsonPath('message', 'Gallery category and its images deleted.');

        $this->assertDatabaseMissing('gallery_tabs', ['id' => $interior['id']]);
        $this->assertDatabaseMissing('gallery_images', ['gallery_tab_id' => $interior['id']]);
        foreach ($paths as $path) {
            Storage::disk('public')->assertMissing($path);
        }
        $this->assertDatabaseHas('gallery_tabs', ['id' => $services['id'], 'display_order' => 1]);
    }

    public function test_gallery_input_and_stale_order_requests_are_rejected(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $tab = GalleryTab::query()->create(['name' => 'Interior', 'display_order' => 1]);
        $other = GalleryTab::query()->create(['name' => 'Tools', 'display_order' => 2]);

        $this->actingAs($user)
            ->postJson('/api/v1/management/gallery-tabs', ['name' => ' interior '])
            ->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'A gallery category with this name already exists.');

        $this->actingAs($user)
            ->post('/api/v1/management/gallery', [
                'gallery_tab_id' => $tab->id,
                'alt_text' => '',
                'image' => UploadedFile::fake()->create('gallery.gif', 100, 'image/gif'),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['alt_text', 'image']);

        $this->actingAs($user)
            ->patchJson('/api/v1/management/gallery-tabs/display-order', ['ids' => [$tab->id]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.ids.0', 'The category list changed. Refresh the page and try ordering it again.');

        $image = GalleryImage::query()->create([
            'gallery_tab_id' => $tab->id,
            'image_path' => 'gallery/example.jpg',
            'alt_text' => 'Example',
            'display_order' => 1,
            'uploaded_by_user_id' => $user->id,
        ]);

        $this->actingAs($user)
            ->patchJson("/api/v1/management/gallery-tabs/{$other->id}/image-order", ['ids' => [$image->id]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.ids.0', 'The image list changed. Refresh the page and try ordering it again.');
    }

    public function test_an_authorized_user_can_delete_a_gallery_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $tab = GalleryTab::query()->create(['name' => 'Interior', 'display_order' => 1]);
        $image = GalleryImage::query()->create([
            'gallery_tab_id' => $tab->id,
            'image_path' => 'gallery/to-delete.webp',
            'alt_text' => 'Court interior',
            'display_order' => 1,
            'uploaded_by_user_id' => $user->id,
        ]);
        Storage::disk('public')->put($image->image_path, 'image contents');

        $this->actingAs($user)
            ->deleteJson("/api/v1/management/gallery/{$image->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Gallery image deleted.');

        $this->assertDatabaseMissing('gallery_images', ['id' => $image->id]);
        Storage::disk('public')->assertMissing($image->image_path);
    }

    public function test_gallery_management_requires_authentication_and_module_access(): void
    {
        $this->getJson('/api/v1/management/gallery-tabs')->assertUnauthorized();
        $this->getJson('/api/v1/management/gallery?gallery_tab_id=1')->assertUnauthorized();

        $role = Role::factory()->create(['is_full_access' => false]);
        $user = User::factory()->for($role)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/management/gallery-tabs')
            ->assertForbidden()
            ->assertJsonPath('code', 'FORBIDDEN');
    }
}
