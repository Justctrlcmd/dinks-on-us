"use client";

import { useEffect, useState } from "react";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { isApiError } from "@/lib/api";
import { startRateLimitCooldown } from "@/lib/rate-limit-cooldown";
import { sendReservationEmailCode, verifyReservationEmailCode } from "@/services/reservations/reservation-email-verification-service";

export function useReservationEmailVerification(email: string, refreshAvailability: () => Promise<unknown>) {
  const normalizedEmail = email.trim().toLowerCase();
  // Guest checkout capability only; never persist it with remembered contact details.
  const [checkout, setCheckout] = useState<{ email: string; key: string } | null>(null);
  if (checkout && checkout.email !== normalizedEmail) setCheckout(null);
  const checkoutKey = checkout?.email === normalizedEmail ? checkout.key : null;
  const [now, setNow] = useState(() => Date.now());
  const sendMutation = useRateLimitedMutation("reservation-email-send", {
    mutationFn: sendReservationEmailCode,
    onError: (error) => {
      if (isApiError(error) && error.status === 503 && error.code === "EMAIL_DELIVERY_UNAVAILABLE" && error.retryAfterSeconds) {
        startRateLimitCooldown("reservation-email-send", error.retryAfterSeconds);
      }
    },
  });
  const verifyMutation = useRateLimitedMutation("reservation-email-verify", {
    mutationFn: verifyReservationEmailCode,
    onSuccess: async () => { await refreshAvailability(); },
  });
  const resetSend = sendMutation.reset;
  const resetVerify = verifyMutation.reset;

  useEffect(() => {
    resetSend();
    resetVerify();
  }, [normalizedEmail, resetSend, resetVerify]);

  const challenge = sendMutation.data?.data;
  const verification = verifyMutation.data?.data;
  useEffect(() => {
    if (!challenge && !verification) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, verification]);

  const challengeMatches = challenge?.email === normalizedEmail && sendMutation.variables?.checkout_key === checkoutKey;
  const verified = verification?.email === normalizedEmail
    && verifyMutation.variables?.checkout_key === checkoutKey
    && Date.parse(verification.verification_expires_at) > now;
  const resendSeconds = challengeMatches ? Math.max(0, Math.ceil((Date.parse(challenge.resend_available_at) - now) / 1000)) : 0;
  const codeExpired = Boolean(challengeMatches && Date.parse(challenge.code_expires_at) <= now);

  return {
    sendMutation, verifyMutation, verified, resendSeconds, codeExpired,
    hasChallenge: Boolean(challengeMatches),
    verificationExpired: Boolean(verification?.email === normalizedEmail && !verified),
    checkoutKey: checkoutKey,
    async sendCode() {
      const key = checkoutKey ?? globalThis.crypto.randomUUID();
      setCheckout({ email: normalizedEmail, key });
      resetVerify();
      setNow(Date.now());
      return sendMutation.mutateAsync({ checkout_key: key, customer_email: normalizedEmail });
    },
    async verifyCode(code: string) {
      if (!checkoutKey) return;
      setNow(Date.now());
      return verifyMutation.mutateAsync({ checkout_key: checkoutKey, customer_email: normalizedEmail, code });
    },
    invalidate: resetVerify,
  };
}
