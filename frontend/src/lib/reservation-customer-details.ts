const STORAGE_KEY = "dinks-on-us:reservation-customer-details";

export type ReservationCustomerDetails = {
  customer_name: string;
  customer_email: string;
  customer_contact_number: string;
};

function isCustomerDetails(value: unknown): value is ReservationCustomerDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as Partial<ReservationCustomerDetails>;
  return typeof details.customer_name === "string" && details.customer_name.trim().length > 0 && details.customer_name.length <= 180
    && typeof details.customer_email === "string" && details.customer_email.length <= 180 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.customer_email)
    && typeof details.customer_contact_number === "string" && /^09[0-9]{9}$/.test(details.customer_contact_number);
}

export function loadReservationCustomerDetails(): ReservationCustomerDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return isCustomerDetails(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveReservationCustomerDetails(details: ReservationCustomerDetails): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customer_name: details.customer_name.trim(),
      customer_email: details.customer_email.trim().toLowerCase(),
      customer_contact_number: details.customer_contact_number,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearReservationCustomerDetails(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Browser storage may be disabled; clearing the visible form still works.
  }
}
