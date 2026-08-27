"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiFileText,
  FiImage,
  FiLock,
  FiShield,
  FiSmartphone,
  FiUploadCloud,
} from "react-icons/fi";
import { ReservationPolicyBanner } from "@/components/public/reservation/reservation-policy-banner";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicPaymentMethods } from "@/hooks/queries/use-payment-methods";
import { useSubmitReservation } from "@/hooks/mutations/use-reservation-mutations";
import { formatHourRange } from "@/lib/time";
import type { PublicPaymentMethod } from "@/types/payment-method";
import { RESERVATION_DRAFT_STORAGE_KEY, type ManagementReservation, type ReservationDraft, type ReservationSlot } from "@/types/reservation";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const noPaymentMethods: PublicPaymentMethod[] = [];

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTimeRange(slot: ReservationSlot) {
  return formatHourRange(slot.startHour, slot.endHour);
}

function isReservationDraft(value: unknown): value is ReservationDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<ReservationDraft>;
  return Array.isArray(draft.selectedSlots) && Array.isArray(draft.equipment) && typeof draft.additionalPlayers === "number";
}

const subscribeToNothing = () => () => {};

type SummaryGroup = {
  date: string;
  courts: Array<{ courtId: number; courtName: string; slots: ReservationSlot[] }>;
};

function groupSelectedSlots(slots: ReservationSlot[]): SummaryGroup[] {
  const byDate = new Map<string, Map<number, ReservationSlot[]>>();

  for (const slot of slots) {
    const courts = byDate.get(slot.date) ?? new Map<number, ReservationSlot[]>();
    const courtSlots = courts.get(slot.courtId) ?? [];
    courtSlots.push(slot);
    courts.set(slot.courtId, courtSlots);
    byDate.set(slot.date, courts);
  }

  return Array.from(byDate.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, courts]) => ({
      date,
      courts: Array.from(courts.entries())
        .sort(([first], [second]) => first - second)
        .map(([courtId, courtSlots]) => ({
          courtId,
          courtName: courtSlots[0].courtName,
          slots: courtSlots.sort((first, second) => first.startHour - second.startHour),
        })),
    }));
}

function SectionHeading({ id, eyebrow, title, description }: { id?: string; eyebrow: string; title: string; description?: string }) {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-energy">{eyebrow}</p>
      <h2 id={id} className="mt-2 font-heading text-xl font-extrabold tracking-[-.035em] sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </header>
  );
}

function ReservationSummary({ draft }: { draft: ReservationDraft }) {
  const groups = groupSelectedSlots(draft.selectedSlots);
  const courtSubtotal = draft.selectedSlots.reduce((total, slot) => total + slot.price, 0);
  const equipmentLines = draft.equipment.filter((item) => item.quantity > 0);
  const equipmentSubtotal = equipmentLines.reduce((total, item) => total + item.price * item.quantity, 0);
  const additionalPlayerSubtotal = draft.additionalPlayers * draft.additionalPlayerUnitPrice;
  const total = courtSubtotal + equipmentSubtotal + additionalPlayerSubtotal;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="reservation-summary-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-energy">Reservation summary</p>
          <h2 id="reservation-summary-title" className="mt-2 font-heading text-xl font-extrabold tracking-[-.035em] sm:text-2xl">
            {draft.selectedSlots.length} {draft.selectedSlots.length === 1 ? "court slot" : "court slots"}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[.65rem] font-bold uppercase tracking-[.18em] text-muted-foreground">Total</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-primary sm:text-3xl">{currency.format(total)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t border-border pt-5">
        {groups.map((group) => (
          <div key={group.date}>
            <h3 className="font-heading text-base font-extrabold">{longDate.format(parseDateOnly(group.date))}</h3>
            <div className="mt-3 grid gap-3">
              {group.courts.map((court) => (
                <div key={`${group.date}-${court.courtId}`} className="rounded-xl border border-border bg-background p-3 sm:p-4">
                  <p className="font-heading font-extrabold uppercase tracking-[.08em]">{court.courtName}</p>
                  <ul className="mt-3 grid gap-2">
                    {court.slots.map((slot) => (
                      <li key={`${slot.date}-${slot.courtId}-${slot.startHour}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                        <span className="min-w-0 text-muted-foreground">{formatTimeRange(slot)}</span>
                        <span className="font-semibold">{currency.format(slot.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}

        {equipmentLines.length > 0 ? (
          <div>
            <h3 className="font-heading text-base font-extrabold">Equipment rental</h3>
            <ul className="mt-3 grid gap-2 rounded-xl border border-border bg-background p-3 sm:p-4">
              {equipmentLines.map((item) => (
                <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span className="min-w-0 text-muted-foreground">{item.name} × {item.quantity}</span>
                  <span className="font-semibold">{currency.format(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {draft.additionalPlayers > 0 ? (
          <div>
            <h3 className="font-heading text-base font-extrabold">Additional players</h3>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-sm sm:p-4">
              <span className="text-muted-foreground">{draft.additionalPlayers} × {currency.format(draft.additionalPlayerUnitPrice)}</span>
              <span className="font-semibold">{currency.format(additionalPlayerSubtotal)}</span>
            </div>
          </div>
        ) : null}
      </div>

      <dl className="mt-5 grid gap-3 border-t border-border pt-5 text-sm">
        <div className="flex items-end justify-between gap-4 border-t border-border pt-4"><dt className="font-heading text-lg font-extrabold">Amount to pay</dt><dd className="font-heading text-2xl font-extrabold text-primary">{currency.format(total)}</dd></div>
        {equipmentLines.length > 0 ? <p className="text-xs leading-5 text-muted-foreground">Equipment availability is confirmed when your reservation is verified. Pending reservations do not hold equipment.</p> : null}
      </dl>
    </section>
  );
}

function PaymentMethodDetails({ method }: { method: PublicPaymentMethod }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/35 bg-background text-foreground">
      <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-current/75">Pay with</p>
          <p className="font-heading text-xl font-extrabold">{method.name}</p>
        </div>
        <FiSmartphone className="size-7" aria-hidden="true" />
      </div>
      <div className="grid justify-items-center gap-3 p-6 text-center">
        <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-xl border-4 border-primary bg-card p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={method.qr_image_url} alt={`${method.name} payment QR code`} className="size-full object-contain" />
        </div>
        <dl className="grid gap-1 text-center">
          <div>
            <dt className="text-xs uppercase tracking-[.14em] text-muted-foreground">Account Number</dt>
            <dd className="font-heading text-2xl font-bold sm:text-3xl">{method.account_number}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[.14em] text-muted-foreground">Account Name</dt>
            <dd className="font-heading text-md sm:text-xl">{method.account_name}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function ReservationCheckout() {
  const loaded = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const paymentMethodsQuery = usePublicPaymentMethods();
  const draft = useMemo(() => {
    if (!loaded) return null;

    try {
      const stored = window.sessionStorage.getItem(RESERVATION_DRAFT_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : null;
      return isReservationDraft(parsed) && parsed.selectedSlots.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }, [loaded]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState<ManagementReservation | null>(null);
  const submitMutation = useSubmitReservation();

  const paymentMethods = paymentMethodsQuery.data ?? noPaymentMethods;
  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => String(method.id) === paymentMethodId) ?? paymentMethods[0] ?? null,
    [paymentMethodId, paymentMethods],
  );

  function submitReservationForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acknowledged || !selectedPaymentMethod || !draft) return;
    const source = new FormData(event.currentTarget);
    const input = new FormData();
    input.set("customer_name", String(source.get("fullName") ?? ""));
    input.set("customer_email", String(source.get("email") ?? ""));
    input.set("customer_contact_number", String(source.get("mobile") ?? ""));
    input.set("payment_method_id", String(selectedPaymentMethod.id));
    input.set("payment_reference_number", String(source.get("referenceNumber") ?? ""));
    const proof = source.get("receipt");
    if (proof instanceof File) input.set("payment_proof", proof);
    input.set("additional_players", String(draft.additionalPlayers));
    input.set("policy_acknowledged", "1");
    draft.selectedSlots.forEach((slot, index) => {
      input.set(`slots[${index}][court_id]`, String(slot.courtId));
      input.set(`slots[${index}][date]`, slot.date);
      input.set(`slots[${index}][start_hour]`, String(slot.startHour));
    });
    draft.equipment.forEach((item, index) => {
      input.set(`equipment[${index}][id]`, String(item.id));
      input.set(`equipment[${index}][quantity]`, String(item.quantity));
    });
    submitMutation.mutate(input, { onSuccess: (response) => {
      setSubmitted(response.data);
      window.sessionStorage.removeItem(RESERVATION_DRAFT_STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } });
  }

  if (!loaded) {
    return <div className="mx-auto min-h-[40svh] max-w-[76rem] px-6 sm:px-10"><div className="h-64 animate-pulse rounded-2xl bg-muted" /></div>;
  }

  if (!draft) {
    return (
      <section className="mx-auto max-w-xl px-6 text-center sm:px-10">
        <div className="rounded-2xl border border-border bg-card p-7 sm:p-10">
          <FiFileText className="mx-auto size-10 text-primary" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-[-.04em]">No reservation selected yet</h1>
          <p className="mt-3 leading-7 text-muted-foreground">Choose at least one available court slot before completing your reservation.</p>
          <Button nativeButton={false} className="mt-6 h-12 rounded-full px-6 font-extrabold" render={<Link href="/reserve" />}>
            <FiArrowLeft aria-hidden="true" /> Choose court times
          </Button>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-6 text-center sm:px-10">
        <div className="rounded-2xl border border-primary/35 bg-card p-7 sm:p-12">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary"><FiCheckCircle className="size-8" aria-hidden="true" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-energy">Reservation received</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-[-.045em]">Payment proof received</h1>
          <p className="mt-4 font-heading text-2xl font-extrabold text-primary">{submitted.reference_number}</p>
          <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">Your selected court times are held while staff reviews the submitted payment. Keep this reference for questions about your reservation.</p>
          <Button nativeButton={false} variant="outline" className="mt-7 h-12 rounded-full px-6 font-extrabold" render={<Link href="/" />}>Return home</Button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[76rem] px-6 pb-20 sm:px-10">
      <header className="mb-6">
        <Link href="/reserve" className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <FiArrowLeft aria-hidden="true" /> Back to availability
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-energy">Final reservation step</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-[-.05em] sm:text-5xl">Complete <span className="text-primary">reservation</span></h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Review your costs, add your details, then send payment proof for staff verification.</p>
      </header>

      <form className="grid min-w-0 gap-5" onSubmit={submitReservationForm}>
        <ReservationSummary draft={draft} />
        <ReservationPolicyBanner initialSlug="court-rules" titleId="checkout-policy-title" />

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="customer-information-title">
          <SectionHeading id="customer-information-title" eyebrow="Your information" title="Who is making this reservation?" description="We will use these details for the reservation acknowledgment and payment review." />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="full-name" className="font-bold">Full name <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="full-name" name="fullName" autoComplete="name" required placeholder="Enter your full name" className="h-10 px-4" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-bold">Email address <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="h-10 px-4" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobile" className="font-bold">Mobile number <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="mobile" name="mobile" type="tel" autoComplete="tel" required placeholder="+63 912 345 6789" className="h-10 px-4" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="payment-method-title">
          <SectionHeading id="payment-method-title" eyebrow="Payment method" title="Choose where you will pay" description="Select one method, complete the external transfer, then upload your receipt below." />
          <div className="mt-6">
            <SelectWithLabel
              id="payment-method"
              label="E-wallet or Bank"
              required
              value={selectedPaymentMethod ? String(selectedPaymentMethod.id) : null}
              options={paymentMethods.map((method) => ({ value: String(method.id), label: method.name }))}
              placeholder={paymentMethodsQuery.isPending ? "Loading payment methods…" : "No payment method available"}
              disabled={paymentMethodsQuery.isPending || paymentMethodsQuery.isError || paymentMethods.length === 0}
            triggerClassName="rounded-xl bg-background px-4 font-heading text-base "
              contentClassName="rounded-xl p-1"
              onValueChange={(value) => {
                if (value && paymentMethods.some((method) => String(method.id) === value)) {
                  setPaymentMethodId(value);
                }
              }}
            />
          </div>
          {paymentMethodsQuery.isError ? (
            <p className="mt-4 rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              Payment methods could not be loaded. Please refresh the page and try again.
            </p>
          ) : paymentMethodsQuery.isPending ? (
            <div className="mt-5 h-72 animate-pulse rounded-2xl bg-muted" aria-label="Loading payment details" />
          ) : selectedPaymentMethod ? (
            <div className="mt-5"><PaymentMethodDetails method={selectedPaymentMethod} /></div>
          ) : (
            <p className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
              No payment method is currently available. Please contact Dinks on Us before submitting your reservation.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="payment-proof-title">
          <SectionHeading id="payment-proof-title" eyebrow="Payment proof" title="Submit your transaction details" description="Both the reference number and a clear receipt image are required for manual verification." />
          <div className="mt-6 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="reference-number" className="font-bold">Transaction reference number <span aria-hidden="true" className="text-destructive">*</span></Label>
              <Input id="reference-number" name="referenceNumber" required inputMode="numeric" placeholder="Enter the complete reference number" className="h-10 px-4" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-receipt" className="font-bold">Payment receipt image <span aria-hidden="true" className="text-destructive">*</span></Label>
              <label htmlFor="payment-receipt" className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary/5 p-5 text-center transition-colors hover:bg-primary/10 focus-within:ring-3 focus-within:ring-ring/50">
                {receiptName ? <FiImage className="size-7 text-primary" aria-hidden="true" /> : <FiUploadCloud className="size-7 text-primary" aria-hidden="true" />}
                <span className="mt-3 break-all font-heading font-extrabold">{receiptName || "Choose a receipt image"}</span>
                <span className="mt-1 text-xs leading-5 text-muted-foreground">JPG, PNG, or WEBP · clear and readable</span>
                <input
                  id="payment-receipt"
                  name="receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="sr-only"
                  onChange={(event) => setReceiptName(event.target.files?.[0]?.name ?? "")}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-primary/35 bg-card p-4 sm:p-7">
          <div className="flex gap-3">
            <Checkbox id="acknowledgment" checked={acknowledged} onCheckedChange={setAcknowledged} className="mt-1 size-5" />
            <Label htmlFor="acknowledgment" className="block cursor-pointer text-sm leading-6">
              <strong className="block font-heading text-base">Reservation acknowledgment <span aria-hidden="true" className="text-destructive">*</span></strong>
              <span className="mt-1 block font-normal text-muted-foreground">I reviewed the reservation summary and conditions. I confirm that my information and payment proof are accurate, and I understand that staff must verify the payment before the reservation is confirmed.</span>
            </Label>
          </div>
          <p className="mt-2 pl-8 text-sm leading-6 text-muted-foreground">I have read and agree to the <Link href="/policies/court-rules" className="font-semibold text-primary underline underline-offset-3">Court Rules &amp; Policy</Link>, <Link href="/policies/reservation-rules" className="font-semibold text-primary underline underline-offset-3">Reservation Rules &amp; Policy</Link>, <Link href="/policies/reschedule-policy" className="font-semibold text-primary underline underline-offset-3">Reschedule Policy</Link>, and <Link href="/policies/cancellation-policy" className="font-semibold text-primary underline underline-offset-3">Cancellation Policy</Link>.</p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><FiLock aria-hidden="true" /> Your payment proof is intended only for reservation verification.</div>
          <Button type="submit" disabled={!acknowledged || !selectedPaymentMethod || submitMutation.isPending} className="mt-5 h-13 w-full rounded-full bg-energy px-5 font-extrabold text-energy-foreground hover:bg-energy/90">
            <FiShield aria-hidden="true" /> {submitMutation.isPending ? "Submitting reservation…" : "Submit reservation"}
          </Button>
          {!selectedPaymentMethod ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">A payment method must be available before submitting.</p>
          ) : !acknowledged ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">Check the acknowledgment above to enable submission.</p>
          ) : null}
        </section>
      </form>
    </div>
  );
}
