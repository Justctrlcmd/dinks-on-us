import { publicFetch } from "@/lib/api";
import type { ReservationEmailCodeChallenge, ReservationEmailCodeInput, ReservationEmailVerification } from "@/types/reservation-email-verification";

export const sendReservationEmailCode = (input: ReservationEmailCodeInput) =>
  publicFetch<ReservationEmailCodeChallenge>("/api/v1/public/reservation-email/send", { method: "POST", csrf: true, body: JSON.stringify(input) });

export const verifyReservationEmailCode = (input: ReservationEmailCodeInput & { code: string }) =>
  publicFetch<ReservationEmailVerification>("/api/v1/public/reservation-email/verify", { method: "POST", csrf: true, body: JSON.stringify(input) });
