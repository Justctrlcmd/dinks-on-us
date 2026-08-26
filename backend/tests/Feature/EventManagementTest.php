<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EventManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_publish_update_and_archive_an_event(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $created = $this->actingAs($user)
            ->post('/api/v1/management/events', [
                'header' => '  Grand   Opening ',
                'description' => " Join us.\r\nEveryone is welcome. ",
                'event_date' => '2026-09-12',
                'image' => UploadedFile::fake()->image('opening.jpg', 1600, 900),
            ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('message', 'Event published.')
            ->assertJsonPath('data.header', 'Grand Opening')
            ->assertJsonPath('data.slug', 'grand-opening')
            ->assertJsonPath('data.description', "Join us.\nEveryone is welcome.")
            ->assertJsonPath('data.event_date', '2026-09-12')
            ->assertJsonPath('data.status', Event::STATUS_PUBLISHED)
            ->json('data');

        $event = Event::query()->findOrFail($created['id']);
        $originalSlug = $event->slug;
        $originalImagePath = $event->image_path;
        Storage::disk('public')->assertExists($originalImagePath);

        $this->getJson('/api/v1/public/events')
            ->assertOk()
            ->assertJsonPath('data.0.id', $event->id)
            ->assertJsonPath('meta.total', 1);

        $this->getJson("/api/v1/public/events/{$event->slug}")
            ->assertOk()
            ->assertJsonPath('data.header', 'Grand Opening');

        $this->actingAs($user)
            ->post("/api/v1/management/events/{$event->id}", [
                '_method' => 'PATCH',
                'header' => 'Grand Opening Weekend',
                'description' => 'Updated event details.',
                'event_date' => '2026-09-13',
                'image' => UploadedFile::fake()->image('updated.webp', 1600, 900),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.header', 'Grand Opening Weekend')
            ->assertJsonPath('data.slug', $originalSlug);

        $event->refresh();
        Storage::disk('public')->assertMissing($originalImagePath);
        Storage::disk('public')->assertExists($event->image_path);

        $this->actingAs($user)
            ->deleteJson("/api/v1/management/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Event archived.');

        $event->refresh();
        $this->assertSame(Event::STATUS_ARCHIVED, $event->status);
        Storage::disk('public')->assertExists($event->image_path);

        $this->actingAs($user)->getJson('/api/v1/management/events')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/public/events')->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/public/events/{$event->slug}")
            ->assertNotFound()
            ->assertJsonPath('code', 'NOT_FOUND');
    }

    public function test_duplicate_headers_receive_stable_unique_slugs(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $input = [
            'header' => 'Open Play',
            'description' => 'Community games.',
            'event_date' => '2026-10-01',
        ];

        $this->actingAs($user)->post('/api/v1/management/events', [
            ...$input,
            'image' => UploadedFile::fake()->image('first.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.slug', 'open-play');

        $this->actingAs($user)->post('/api/v1/management/events', [
            ...$input,
            'image' => UploadedFile::fake()->image('second.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.slug', 'open-play-2');
    }

    public function test_event_input_requires_supported_fields_and_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/management/events', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['header', 'description', 'event_date', 'image']);

        $this->actingAs($user)
            ->post('/api/v1/management/events', [
                'header' => 'Open Play',
                'description' => 'Community games.',
                'event_date' => 'not-a-date',
                'image' => UploadedFile::fake()->create('event.gif', 100, 'image/gif'),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.event_date.0', 'Choose a valid event date.')
            ->assertJsonPath('errors.image.0', 'The event image must be a JPG, PNG, or WebP file.');

        $this->actingAs($user)
            ->post('/api/v1/management/events', [
                'header' => 'Open Play',
                'description' => 'Community games.',
                'event_date' => '2026-10-01',
                'image' => UploadedFile::fake()->image('event.png')->size(5121),
            ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.image.0', 'The event image must not be larger than 5 MB.');
    }

    public function test_event_management_requires_authentication(): void
    {
        $this->getJson('/api/v1/management/events')->assertUnauthorized();
        $this->postJson('/api/v1/management/events', [])->assertUnauthorized();
        $this->deleteJson('/api/v1/management/events/1')->assertUnauthorized();
    }
}
