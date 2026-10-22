export interface ReservationEmailCodeInput {
  checkout_key: string;
  customer_email: string;
}

export interface ReservationEmailCodeChallenge {
  email: string;
  code_expires_at: string;
  resend_available_at: string;
}

export interface ReservationEmailVerification {
  email: string;
  verified_at: string;
  verification_expires_at: string;
}
