<?php

namespace App\Services;

use App\Exceptions\ReservationEmailVerificationException;
use App\Mail\ReservationEmailCodeMail;
use App\Models\Reservation;
use App\Models\ReservationEmailVerification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ReservationEmailVerificationService
{
    public function send(string $checkoutKey, string $email): ReservationEmailVerification
    {
        if (! app()->environment(['local', 'testing']) && ! $this->deliveryConfigured()) {
            throw new ReservationEmailVerificationException('Email verification is temporarily unavailable. Please try again later or contact Dinks on Us.', 'EMAIL_DELIVERY_UNAVAILABLE', 503);
        }

        [$verification, $code, $minutes] = DB::transaction(function () use ($checkoutKey, $email): array {
            $keyHash = hash('sha256', $checkoutKey);
            ReservationEmailVerification::query()->firstOrCreate(['checkout_key_hash' => $keyHash], ['email' => $email]);
            $verification = ReservationEmailVerification::query()->where('checkout_key_hash', $keyHash)->lockForUpdate()->firstOrFail();
            if ($verification->reservation_id !== null) {
                throw $this->required();
            }
            if ($verification->resend_available_at?->isFuture()) {
                throw new ReservationEmailVerificationException('Please wait before requesting another code.', 'TOO_MANY_REQUESTS', 429, max(1, (int) ceil(now()->diffInSeconds($verification->resend_available_at))));
            }

            do {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            } while ($verification->code_hash === $this->codeHash($keyHash, $email, $code));
            $minutes = (int) config('reservations.email_verification.code_minutes');
            $verification->update([
                'email' => $email, 'code_hash' => $this->codeHash($keyHash, $email, $code),
                'code_expires_at' => now()->addMinutes($minutes),
                'resend_available_at' => now()->addSeconds((int) config('reservations.email_verification.resend_seconds')),
                'failed_attempts' => 0, 'verified_at' => null, 'verification_expires_at' => null,
            ]);

            return [$verification, $code, $minutes];
        });

        // Commit the resend reservation before SMTP: slow delivery must not
        // hold database locks or allow concurrent requests to send many codes.
        try {
            Mail::to($email)->send(new ReservationEmailCodeMail($code, $minutes));
        } catch (Throwable $exception) {
            // Do not invalidate a newer resend or a successfully consumed code.
            ReservationEmailVerification::query()->whereKey($verification->id)
                ->where('code_hash', $verification->code_hash)
                ->update(['code_hash' => null, 'code_expires_at' => null]);
            Log::warning('Reservation email code delivery failed.', ['exception_type' => $exception::class]);
            throw new ReservationEmailVerificationException('We could not send your verification code. Please try again later or contact Dinks on Us.', 'EMAIL_DELIVERY_UNAVAILABLE', 503);
        }

        return $verification;
    }

    public function verify(string $checkoutKey, string $email, string $code): ReservationEmailVerification
    {
        // Return failures from the transaction so failed-attempt counters commit.
        $result = DB::transaction(function () use ($checkoutKey, $email, $code): ReservationEmailVerification|ReservationEmailVerificationException {
            $verification = ReservationEmailVerification::query()->where('checkout_key_hash', hash('sha256', $checkoutKey))->lockForUpdate()->first();
            if (! $verification || $verification->email !== $email || $verification->reservation_id !== null) {
                return $this->invalidCode();
            }
            if (! $verification->code_hash || ! $verification->code_expires_at?->isFuture()) {
                $verification->update(['code_hash' => null]);

                return new ReservationEmailVerificationException('This code has expired or was already used. Request a new code.', 'EMAIL_CODE_EXPIRED');
            }
            if ($verification->failed_attempts >= (int) config('reservations.email_verification.max_attempts')) {
                return new ReservationEmailVerificationException('Too many incorrect attempts. Request a new code.', 'EMAIL_CODE_ATTEMPTS_EXCEEDED');
            }
            if (! hash_equals($verification->code_hash, $this->codeHash($verification->checkout_key_hash, $email, $code))) {
                $verification->increment('failed_attempts');
                if ($verification->failed_attempts >= (int) config('reservations.email_verification.max_attempts')) {
                    $verification->update(['code_hash' => null]);

                    return new ReservationEmailVerificationException('Too many incorrect attempts. Request a new code.', 'EMAIL_CODE_ATTEMPTS_EXCEEDED');
                }

                return $this->invalidCode();
            }

            $verification->update([
                'code_hash' => null, 'verified_at' => now(),
                'verification_expires_at' => now()->addMinutes((int) config('reservations.email_verification.checkout_minutes')),
            ]);

            return $verification;
        });
        if ($result instanceof ReservationEmailVerificationException) {
            throw $result;
        }

        return $result;
    }

    public function forSubmission(array $input, ?int $reservationId = null, bool $lock = false, ?string $idempotencyKey = null): ReservationEmailVerification
    {
        $query = ReservationEmailVerification::query()->where('checkout_key_hash', hash('sha256', $input['checkout_key'] ?? ''));
        $verification = ($lock ? $query->lockForUpdate() : $query)->first();
        if (! $verification || $verification->email !== ($input['customer_email'] ?? null)) {
            throw $this->required();
        }
        if ($verification->reservation_id !== null && $idempotencyKey !== null
            && Reservation::query()->whereKey($verification->reservation_id)->where('idempotency_key', $idempotencyKey)->lockForUpdate()->exists()) {
            return $verification;
        }
        if ($reservationId !== null) {
            if ($verification->reservation_id !== $reservationId) {
                throw $this->required();
            }

            return $verification;
        }
        if ($verification->reservation_id !== null || ! $verification->verified_at || ! $verification->verification_expires_at?->isFuture()) {
            throw $this->required();
        }

        return $verification;
    }

    private function codeHash(string $keyHash, string $email, string $code): string
    {
        return hash_hmac('sha256', $keyHash.'|'.$email.'|'.$code, (string) config('app.key'));
    }

    public function deliveryConfigured(): bool
    {
        return $this->mailerDelivers((string) config('mail.default'));
    }

    private function mailerDelivers(string $name, array $visited = []): bool
    {
        if (in_array($name, $visited, true)) {
            return false;
        }
        $transport = config("mail.mailers.{$name}.transport");
        if (! $transport || in_array($transport, ['log', 'array'], true)) {
            return false;
        }
        if (! in_array($transport, ['failover', 'roundrobin'], true)) {
            return true;
        }
        $mailers = config("mail.mailers.{$name}.mailers", []);
        if ($mailers === []) {
            return false;
        }
        foreach ($mailers as $mailer) {
            if (! $this->mailerDelivers($mailer, [...$visited, $name])) {
                return false;
            }
        }

        return true;
    }

    private function required(): ReservationEmailVerificationException
    {
        return new ReservationEmailVerificationException('Verify your email address before submitting this reservation.', 'EMAIL_VERIFICATION_REQUIRED');
    }

    private function invalidCode(): ReservationEmailVerificationException
    {
        return new ReservationEmailVerificationException('The verification code is incorrect. Please check it and try again.', 'EMAIL_CODE_INVALID');
    }
}
