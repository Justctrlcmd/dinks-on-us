<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const RULE = 'If a verified reservation is rescheduled, the customer will receive an email showing the updated court, date, and time.';

    public function up(): void
    {
        $subheaderId = DB::table('policy_subheaders')
            ->where('title', 'Reservation Email Notifications')
            ->value('id');

        if (! $subheaderId || DB::table('policy_rules')->where('policy_subheader_id', $subheaderId)->where('content', self::RULE)->exists()) {
            return;
        }

        $customerResponsibilityRule = DB::table('policy_rules')
            ->where('policy_subheader_id', $subheaderId)
            ->where('content', 'Customers are responsible for providing a valid and accessible email address when submitting their reservation.')
            ->first();
        $sortOrder = $customerResponsibilityRule?->sort_order ?? ((int) DB::table('policy_rules')->where('policy_subheader_id', $subheaderId)->max('sort_order') + 1);

        DB::transaction(function () use ($subheaderId, $customerResponsibilityRule, $sortOrder): void {
            if ($customerResponsibilityRule) {
                DB::table('policy_rules')
                    ->where('policy_subheader_id', $subheaderId)
                    ->where('sort_order', '>=', $sortOrder)
                    ->increment('sort_order');
            }

            DB::table('policy_rules')->insert([
                'policy_subheader_id' => $subheaderId,
                'content' => self::RULE,
                'sort_order' => $sortOrder,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        $rule = DB::table('policy_rules')->where('content', self::RULE)->first();
        if (! $rule) {
            return;
        }

        DB::transaction(function () use ($rule): void {
            DB::table('policy_rules')->where('id', $rule->id)->delete();
            DB::table('policy_rules')
                ->where('policy_subheader_id', $rule->policy_subheader_id)
                ->where('sort_order', '>', $rule->sort_order)
                ->decrement('sort_order');
        });
    }
};
