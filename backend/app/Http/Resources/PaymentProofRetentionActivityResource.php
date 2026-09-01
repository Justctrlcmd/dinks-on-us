<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentProofRetentionActivityResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $details = is_array($this->after) ? $this->after : [];

        $visibleDetails = [
            'from' => $details['from'] ?? null,
            'to' => $details['to'] ?? null,
            'reservations_affected' => (int) ($details['reservations_affected'] ?? 0),
            'proofs_deleted' => (int) ($details['proofs_deleted'] ?? 0),
            'reclaimed_bytes' => (int) ($details['reclaimed_bytes'] ?? 0),
            'result' => $details['result'] ?? 'COMPLETED',
        ];

        foreach (['missing_files', 'failed_files'] as $key) {
            if ((int) ($details[$key] ?? 0) > 0) {
                $visibleDetails[$key] = (int) $details[$key];
            }
        }

        return [
            'id' => $this->id,
            'action' => $this->action,
            'actor_name' => $this->user?->name ?? 'Management',
            'details' => $visibleDetails,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
