<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const REMOVED_RULES = [
        'After successfully submitting a reservation, the customer will receive an email acknowledging that the reservation has been received and is awaiting verification.',
        'The reservation-received email is an acknowledgment only and does not represent final booking confirmation.',
    ];

    private const CHANGES = [
        'After Dinks On Us staff or management reviews the reservation and submitted payment proof, the customer will receive another email informing them of the reservation result.' => 'Dinks On Us sends a customer email after staff or management reviews the reservation and submitted payment proof.',
        'If the reservation is rejected, the customer will receive an email informing them that the reservation was not approved.' => 'If the reservation is rejected, the customer will receive an email informing them that the reservation was not approved and explaining the reason.',
    ];

    public function up(): void
    {
        $subheaderId = $this->subheaderId();
        if (! $subheaderId) {
            return;
        }

        DB::transaction(function () use ($subheaderId): void {
            DB::table('policy_rules')
                ->where('policy_subheader_id', $subheaderId)
                ->whereIn('content', self::REMOVED_RULES)
                ->delete();

            foreach (self::CHANGES as $old => $new) {
                DB::table('policy_rules')
                    ->where('policy_subheader_id', $subheaderId)
                    ->where('content', $old)
                    ->update(['content' => $new, 'updated_at' => now()]);
            }

            $this->normalizeOrder($subheaderId);
        });
    }

    public function down(): void
    {
        $subheaderId = $this->subheaderId();
        if (! $subheaderId) {
            return;
        }

        DB::transaction(function () use ($subheaderId): void {
            foreach (self::CHANGES as $old => $new) {
                DB::table('policy_rules')
                    ->where('policy_subheader_id', $subheaderId)
                    ->where('content', $new)
                    ->update(['content' => $old, 'updated_at' => now()]);
            }

            DB::table('policy_rules')->where('policy_subheader_id', $subheaderId)->increment('sort_order', 2);
            $now = now();
            foreach (self::REMOVED_RULES as $index => $content) {
                DB::table('policy_rules')->insert([
                    'policy_subheader_id' => $subheaderId,
                    'content' => $content,
                    'sort_order' => $index + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        });
    }

    private function subheaderId(): ?int
    {
        $id = DB::table('policy_subheaders')
            ->where('title', 'Reservation Email Notifications')
            ->value('id');

        return $id === null ? null : (int) $id;
    }

    private function normalizeOrder(int $subheaderId): void
    {
        DB::table('policy_rules')
            ->where('policy_subheader_id', $subheaderId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->pluck('id')
            ->each(fn ($id, $index) => DB::table('policy_rules')->where('id', $id)->update(['sort_order' => $index + 1]));
    }
};
