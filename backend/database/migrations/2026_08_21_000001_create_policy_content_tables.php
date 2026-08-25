<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('policy_sections', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->unsignedSmallInteger('sort_order');
            $table->timestamps();
        });

        Schema::create('policy_subheaders', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('policy_section_id')->constrained()->restrictOnDelete();
            $table->string('title');
            $table->unsignedInteger('sort_order');
            $table->timestamps();

            $table->index(['policy_section_id', 'sort_order']);
        });

        Schema::create('policy_rules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('policy_subheader_id')->constrained()->restrictOnDelete();
            $table->text('content');
            $table->unsignedInteger('sort_order');
            $table->timestamps();

            $table->index(['policy_subheader_id', 'sort_order']);
        });

        $now = now();
        DB::table('policy_sections')->insert([
            ['slug' => 'court-rules', 'name' => 'Court Rules & Policy', 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'reservation-rules', 'name' => 'Reservation Rules & Policy', 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'reschedule-policy', 'name' => 'Reschedule Policy', 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'cancellation-policy', 'name' => 'Cancellation Policy', 'sort_order' => 4, 'created_at' => $now, 'updated_at' => $now],
        ]);

        $sectionIds = DB::table('policy_sections')->pluck('id', 'slug');
        $subheaders = [
            'court-rules' => [
                'Arrival and Court Time' => ['Players are encouraged to arrive at least 10–15 minutes before their scheduled booking time.', 'The reserved court schedule remains fixed even if players arrive late.', 'Late arrival will not extend the reserved playing time or entitle the customer to additional court time.', 'Players must vacate the court promptly at the end of their reserved time, especially when another reservation follows.'],
                'Extension of Playing Time' => ['An extension may only be allowed when the court remains available immediately after the scheduled reservation.', 'Any approved extension is subject to the applicable court rate.', 'All extensions must be approved by Dinks On Us staff or management before additional playing time begins.'],
                'Number of Players' => ['Customers must observe the maximum number of players permitted for each court or session.', 'A court may accommodate a maximum of twelve (12) players when being used for open play.', 'Additional players may only join when permitted by Dinks On Us and when the maximum court capacity has not been reached.', 'The customer who made the reservation is responsible for ensuring that all members of their group comply with Dinks On Us rules and policies.', 'Dinks On Us reserves the right to limit or refuse additional players once the permitted capacity has been reached.'],
                'Court Use and Conduct' => ['Players must use the courts, facilities, equipment, and other property responsibly and only for their intended purpose.', 'Players must follow Dinks On Us requirements regarding appropriate pickleball or non-marking court shoes.', 'Abusive, threatening, disruptive, disrespectful, or unsafe behavior toward staff, players, or guests will not be tolerated.', 'Any intentional or negligent damage to court facilities, equipment, furniture, or other property may be charged to the responsible customer.'],
                'Personal Belongings' => ['Customers are responsible for securing and monitoring their personal belongings.', 'Dinks On Us shall not be responsible for personal items that are lost, stolen, misplaced, or damaged while inside the facility.'],
                "Management's Right to Refuse or Terminate Court Use" => ['Dinks On Us reserves the right to refuse, suspend, or terminate a reservation or court session when court rules or policies are violated.', 'Court use may also be terminated due to unsafe or inappropriate behavior, harassment, abusive conduct, property damage, failure to follow staff instructions, or any circumstance that may affect the safety, security, or enjoyment of other customers.'],
            ],
            'reservation-rules' => [
                'Reservation Submission and Confirmation' => ['Court schedules are subject to availability at the time a reservation is submitted.', 'Submitting a reservation does not immediately mean that the reservation has been confirmed.', 'After a reservation is submitted, Dinks On Us will review the submitted reservation information and payment proof.', 'A reservation becomes confirmed only after the payment has been successfully verified and approved by Dinks On Us staff or management.', 'Reservations with invalid, incomplete, or unverified payment information may be rejected, after which the selected court schedule may become available to other customers again.'],
                'Reservation Email Notifications' => ['After successfully submitting a reservation, the customer will receive an email acknowledging that the reservation has been received and is awaiting verification.', 'The reservation-received email is an acknowledgment only and does not represent final booking confirmation.', 'After Dinks On Us staff or management reviews the reservation and submitted payment proof, the customer will receive another email informing them of the reservation result.', 'If the reservation is verified, the customer will receive a confirmation email stating that the reservation has been approved and confirmed.', 'If the reservation is rejected, the customer will receive an email informing them that the reservation was not approved.', 'Customers are responsible for providing a valid and accessible email address when submitting their reservation.'],
                'Payment Rules' => ['Customers must provide the required payment or deposit according to the amount and instructions displayed during the reservation process.', 'Payment proof and any required payment information must be submitted for verification.', 'Dinks On Us reserves the right to reject reservations containing invalid, insufficient, inaccurate, or unverifiable payment information.', 'Any remaining payment required by Dinks On Us must be settled within the specified payment period.', 'Failure to settle the required amount within the prescribed period may result in cancellation or rejection of the reservation.', 'Confirmed payments are subject to the applicable Cancellation Policy and Reschedule Policy.'],
                'Acceptance of Rules and Policies' => ['By submitting a reservation, the customer confirms that they have read, understood, and agreed to the applicable Dinks On Us Rules & Policies, Reschedule Policy, and Cancellation Policy.', 'The customer is responsible for ensuring that the members of their group also comply with applicable court rules.', 'Dinks On Us reserves the right to amend its rules and policies when reasonably necessary to maintain safety, fairness, proper facility operation, and service quality.'],
            ],
            'reschedule-policy' => [
                'Rescheduling Rules' => ['A confirmed court reservation may be rescheduled once.', 'A rescheduling request must be made at least forty-eight (48) hours before the scheduled booking time.', 'Requests submitted less than forty-eight (48) hours before the scheduled booking will generally not be accepted, except when Dinks On Us determines that a Force Majeure circumstance applies.', 'All rescheduling requests are subject to court availability and approval by Dinks On Us management.', 'A reservation may only be transferred to an available date and time permitted by Dinks On Us.', 'Once a rescheduled reservation has been approved and confirmed, it becomes final and cannot be rescheduled again.', 'Failure to attend either the original booking or an approved rescheduled booking will be considered a no-show.', 'Payments associated with a no-show are non-refundable and non-transferable.', 'Customers must submit rescheduling requests through an official Dinks On Us contact or booking channel.', 'Dinks On Us reserves the right to decline a requested reschedule when the requested court, date, or time is unavailable.'],
                'Force Majeure' => ['Force Majeure refers to extraordinary circumstances beyond the reasonable control of Dinks On Us or the customer, including natural disasters, severe weather, government restrictions, fire, or similar events that make the scheduled booking impracticable or unsafe.', 'When a qualifying Force Majeure event occurs, Dinks On Us may provide an alternative schedule, credit, cancellation, or another reasonable arrangement depending on availability and the circumstances involved.'],
            ],
            'cancellation-policy' => [
                'Cancellation Rules' => ['All confirmed court reservations are considered final and non-cancellable.', 'Customers may not cancel a confirmed reservation for personal reasons, change of plans, late arrival, illness, transportation problems, failure to attend, or similar circumstances.', 'Payments for bookings that customers do not attend or attempt to cancel for reasons other than an accepted Force Majeure event are non-refundable and non-transferable.', 'Failure to attend a confirmed booking without an approved rescheduling arrangement will be considered a no-show.'],
                'Force Majeure' => ['Cancellation may be considered when an accepted Force Majeure circumstance makes the scheduled reservation impracticable or unsafe.', 'Force Majeure may include natural disasters, severe weather conditions, government-imposed restrictions, fire, or other extraordinary circumstances beyond the reasonable control of the customer or Dinks On Us.', 'In such circumstances, Dinks On Us may, at its discretion, offer cancellation, rescheduling, booking credit, or another reasonable arrangement.', 'Any accommodation provided for a Force Majeure event remains subject to the circumstances, court availability, and approval of Dinks On Us management.'],
            ],
        ];

        foreach ($subheaders as $slug => $groups) {
            $position = 0;
            foreach ($groups as $title => $rules) {
                $subheaderId = DB::table('policy_subheaders')->insertGetId([
                    'policy_section_id' => $sectionIds[$slug], 'title' => $title, 'sort_order' => ++$position, 'created_at' => $now, 'updated_at' => $now,
                ]);
                foreach ($rules as $rulePosition => $content) {
                    DB::table('policy_rules')->insert(['policy_subheader_id' => $subheaderId, 'content' => $content, 'sort_order' => $rulePosition + 1, 'created_at' => $now, 'updated_at' => $now]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('policy_rules');
        Schema::dropIfExists('policy_subheaders');
        Schema::dropIfExists('policy_sections');
    }
};
