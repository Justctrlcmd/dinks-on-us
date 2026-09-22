"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiFileText,
  FiImage,
  FiInfo,
  FiLock,
  FiShield,
  FiUploadCloud,
} from "react-icons/fi";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { useToast } from "@/components/common/toast-provider";
import { PublicMessageButton } from "@/components/public/public-site-frame";
import { ReservationPolicyBanner, ReservationPolicyDialog } from "@/components/public/reservation/reservation-policy-banner";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { usePublicPaymentMethods } from "@/hooks/queries/use-payment-methods";
import { useReservationOptions } from "@/hooks/queries/use-court-pricing";
import { useSubmitReservation } from "@/hooks/mutations/use-reservation-mutations";
import { isApiError } from "@/lib/api";
import { formatHourRange } from "@/lib/time";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { PublicPaymentMethod } from "@/types/payment-method";
import { RESERVATION_DRAFT_STORAGE_KEY, type ManagementReservation, type ReservationDraft, type ReservationSlot } from "@/types/reservation";
import { reservationCheckoutSchema, type ReservationCheckoutValues } from "@/validation/custom/reservation-checkout-schema";

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

function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  if (!cryptoApi?.getRandomValues) throw new Error("Secure submission identifiers are unavailable in this browser.");

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTimeRange(slot: ReservationSlot) {
  return formatHourRange(slot.startHour, slot.endHour);
}

function reservationTotal(draft: ReservationDraft) {
  return draft.selectedSlots.reduce((total, slot) => total + slot.price, 0)
    + draft.equipment.reduce((total, item) => total + item.price * item.quantity, 0)
    + draft.additionalPlayers * draft.additionalPlayerUnitPrice;
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
      </dl>
    </section>
  );
}

function PaymentMethodDetails({ method }: { method: PublicPaymentMethod }) {
  const [isSafetyReminderOpen, setIsSafetyReminderOpen] = useState(true);

  return (
    <div className="overflow-visible rounded-2xl border border-primary/35 bg-background text-foreground">
      <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-current/75">Pay with</p>
          <p className="font-heading text-xl font-extrabold">{method.name}</p>
        </div>
        <div className="relative z-10">
          <button
            type="button"
            aria-label={isSafetyReminderOpen ? "Hide payment safety reminder" : "Show payment safety reminder"}
            aria-expanded={isSafetyReminderOpen}
            aria-describedby={isSafetyReminderOpen ? "payment-safety-reminder" : undefined}
            onClick={() => setIsSafetyReminderOpen((open) => !open)}
            className="grid size-11 shrink-0 place-items-center rounded-full text-primary-foreground transition-colors hover:bg-primary-foreground/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
          >
            <FiInfo className="size-6" aria-hidden="true" />
          </button>
          {isSafetyReminderOpen ? (
            <p id="payment-safety-reminder" role="tooltip" className="absolute top-full right-0 z-50 mt-3 w-64 rounded-lg bg-foreground px-3 py-2.5 text-left text-xs leading-relaxed text-background shadow-lg before:absolute before:-top-1.5 before:right-4 before:size-3 before:rotate-45 before:bg-foreground">
              Before paying, confirm the account name and number match in your wallet or bank app. Don’t send payment if they differ.
            </p>
          ) : null}
        </div>
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
  const toast = useToast();
  const paymentMethodsQuery = usePublicPaymentMethods();
  const form = useForm<ReservationCheckoutValues>({
    resolver: zodResolver(reservationCheckoutSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_contact_number: "",
      payment_method_id: "",
      payment_reference_number: "",
      payment_proof: undefined,
      policy_acknowledged: false,
    },
  });
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
  const optionsQuery = useReservationOptions(
    draft?.selectedSlots[0]?.date ?? "",
    draft?.selectedSlots.map((slot) => slot.startHour) ?? [],
  );
  const checkoutReview = useMemo(() => {
    const options = optionsQuery.data;
    if (!draft || !options || !options.configuration) return null;

    const unavailable = new Set(options.unavailable_slots.map((slot) => `${slot.court_id}-${slot.start_hour}`));
    const courts = new Map(options.courts.map((court) => [court.id, court]));
    const selectedSlots = draft.selectedSlots.map((selected) => {
      const court = courts.get(selected.courtId);
      const period = options.slots.find((slot) => slot.start_hour === selected.startHour);
      const available = Boolean(court && period) && !unavailable.has(`${selected.courtId}-${selected.startHour}`);
      return {
        ...selected,
        courtName: court?.name ?? selected.courtName,
        endHour: period?.end_hour ?? selected.endHour,
        price: period?.price ?? selected.price,
        available,
      };
    });
    const scheduleAvailable = !options.is_date_closed
      && options.date === draft.selectedSlots[0]?.date
      && selectedSlots.every((slot) => slot.available);

    const equipmentById = new Map(options.equipment.map((item) => [item.id, item]));
    const equipment = draft.equipment.map((selected) => {
      const current = equipmentById.get(selected.id);
      return { ...selected, name: current?.name ?? selected.name, price: current?.price ?? selected.price };
    });
    const equipmentAvailable = draft.equipment.every((selected) => {
      const current = equipmentById.get(selected.id);
      return Boolean(current) && selected.quantity <= (current?.available_quantity ?? 0);
    });
    const refreshedDraft: ReservationDraft = {
      selectedSlots,
      equipment,
      additionalPlayers: draft.additionalPlayers,
      additionalPlayerUnitPrice: options.configuration.additional_player_price,
      includedPlayersPerCourt: options.configuration.included_players_per_court,
    };
    const priceChanged = selectedSlots.some((slot, index) => Math.abs(slot.price - draft.selectedSlots[index].price) > 0.001)
      || equipment.some((item, index) => Math.abs(item.price - draft.equipment[index].price) > 0.001)
      || Math.abs(refreshedDraft.additionalPlayerUnitPrice - draft.additionalPlayerUnitPrice) > 0.001;

    return {
      draft: refreshedDraft,
      valid: scheduleAvailable && equipmentAvailable,
      priceChanged,
    };
  }, [draft, optionsQuery.data]);
  const [submitted, setSubmitted] = useState<ManagementReservation | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string>();
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [emailConfirmationValues, setEmailConfirmationValues] = useState<ReservationCheckoutValues | null>(null);
  const submitMutation = useSubmitReservation();

  const paymentMethods = paymentMethodsQuery.data ?? noPaymentMethods;
  const paymentMethodId = useWatch({ control: form.control, name: "payment_method_id" });
  const acknowledged = useWatch({ control: form.control, name: "policy_acknowledged" });
  const paymentProof = useWatch({ control: form.control, name: "payment_proof" });
  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => String(method.id) === paymentMethodId) ?? null,
    [paymentMethodId, paymentMethods],
  );
  const paymentEvidenceEnabled = selectedPaymentMethod !== null;

  useEffect(() => {
    if (!paymentMethodId && paymentMethods[0]) {
      form.setValue("payment_method_id", String(paymentMethods[0].id));
    }
  }, [form, paymentMethodId, paymentMethods]);

  useEffect(() => {
    if (!paymentEvidenceEnabled) {
      form.setValue("payment_reference_number", "", { shouldDirty: false, shouldValidate: false });
      form.resetField("payment_proof", { defaultValue: undefined });
    }
  }, [form, paymentEvidenceEnabled]);

  async function submitReservation(values: ReservationCheckoutValues) {
    if (!selectedPaymentMethod || !checkoutReview?.valid) return;
    const currentDraft = checkoutReview.draft;
    setSubmitMessage(undefined);
    const input = new FormData();
    input.set("customer_name", values.customer_name);
    input.set("customer_email", values.customer_email);
    input.set("customer_contact_number", values.customer_contact_number);
    input.set("payment_method_id", values.payment_method_id);
    input.set("payment_reference_number", values.payment_reference_number);
    const proof = values.payment_proof?.item(0);
    if (proof) input.set("payment_proof", proof);
    input.set("additional_players", String(currentDraft.additionalPlayers));
    input.set("quoted_amount", reservationTotal(currentDraft).toFixed(2));
    input.set("policy_acknowledged", "1");
    currentDraft.selectedSlots.forEach((slot, index) => {
      input.set(`slots[${index}][court_id]`, String(slot.courtId));
      input.set(`slots[${index}][date]`, slot.date);
      input.set(`slots[${index}][start_hour]`, String(slot.startHour));
    });
    currentDraft.equipment.forEach((item, index) => {
      input.set(`equipment[${index}][id]`, String(item.id));
      input.set(`equipment[${index}][quantity]`, String(item.quantity));
    });
    try {
      const requestKey = idempotencyKey ?? createIdempotencyKey();
      if (!idempotencyKey) setIdempotencyKey(requestKey);
      const response = await submitMutation.mutateAsync({ input, idempotencyKey: requestKey });
      setIdempotencyKey(null);
      setSubmitted(response.data);
      setEmailConfirmationValues(null);
      window.sessionStorage.removeItem(RESERVATION_DRAFT_STORAGE_KEY);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (isApiError(error) && error.code === "RESERVATION_SLOTS_UNAVAILABLE") {
        setEmailConfirmationValues(null);
        setIdempotencyKey(null);
        void optionsQuery.refetch();
        return;
      }

      setSubmitMessage(applyApiErrors(error, form.setError));
    }
  }

  const submit = form.handleSubmit((values) => {
    setSubmitMessage(undefined);
    setEmailConfirmationValues(values);
  }, () => {
    toast.error("Please complete all required fields before submitting.");
  });

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
      <>
        <section className="mx-auto flex w-full max-w-2xl justify-center px-6 text-center sm:px-10">
          <div className="w-full max-w-xl rounded-2xl border border-primary/35 bg-card p-7 sm:p-12">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary"><FiCheckCircle className="size-8" aria-hidden="true" /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-energy">Reservation received</p>
            <p className="mt-4 font-heading text-2xl font-extrabold text-primary">{submitted.reference_number}</p>
            <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">Your selected court times are held while staff reviews the submitted reservation information. An email will be sent to you once the reservation is verified or rejected.</p>
            <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">Keep this reference for questions about your reservation.</p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">If you do not see our email, please check your spam or junk folder.</p>
            <Button nativeButton={false} variant="outline" className="mt-7 h-12 rounded-full px-6 font-extrabold" render={<Link href="/" />}>Return home</Button>
          </div>
        </section>
        <PublicMessageButton />
      </>
    );
  }

  if (optionsQuery.isPending) {
    return <div className="mx-auto min-h-[40svh] max-w-[76rem] px-6 sm:px-10"><div className="h-64 animate-pulse rounded-2xl bg-muted" aria-label="Refreshing reservation pricing" /></div>;
  }

  const currentDraft = checkoutReview?.draft ?? draft;
  const checkoutUnavailable = optionsQuery.isError || !checkoutReview?.valid;

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

      <form className="grid min-w-0 gap-5" onSubmit={submit} noValidate>
        {submitMessage ? <Alert variant="destructive"><AlertDescription>{submitMessage}</AlertDescription></Alert> : null}
        {optionsQuery.isError ? <Alert variant="destructive"><AlertDescription>Current pricing and availability could not be refreshed. Return to availability or refresh this page before submitting.</AlertDescription></Alert> : null}
        {!optionsQuery.isError && !checkoutReview ? <Alert variant="destructive"><AlertDescription>Current reservation pricing is not configured. Return to availability before submitting.</AlertDescription></Alert> : null}
        {checkoutReview && !checkoutReview.valid ? <Alert variant="destructive"><AlertDescription>One or more selected court times or equipment items are no longer available. Return to availability and update the reservation.</AlertDescription></Alert> : null}
        {checkoutReview?.priceChanged ? <Alert><AlertDescription>Pricing changed after your selection. The summary now shows the current configured amount. Review it before making your payment.</AlertDescription></Alert> : null}
        <ReservationSummary draft={currentDraft} />
        <ReservationPolicyBanner initialSlug="court-rules" titleId="checkout-policy-title" />

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="customer-information-title">
          <SectionHeading id="customer-information-title" eyebrow="Your information" title="Who is making this reservation?" description="We will use these details for the reservation acknowledgment and payment review." />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <InputWithLabel
              id="full-name"
              label="Full name"
              autoComplete="name"
              required
              placeholder="Enter your full name"
              className="h-10 px-4 col-span-2 "
              {...form.register("customer_name")}
              error={form.formState.errors.customer_name?.message}
            />
            <InputWithLabel
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="h-10 px-4"
              {...form.register("customer_email")}
              error={form.formState.errors.customer_email?.message}
            />
          <InputWithLabel
              id="mobile"
              label="Mobile number"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              pattern="09[0-9]{9}"
              autoComplete="tel"
              required
              onInput={(event) => {
                event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 11);
              }}
              placeholder="09XXXXXXXXX"
              className="h-10 px-4"
              {...form.register("customer_contact_number")}
              error={form.formState.errors.customer_contact_number?.message}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="payment-method-title">
          <SectionHeading id="payment-method-title" eyebrow="Payment method" title="Choose where you will pay" description="Select one method, complete the external transfer, then upload your receipt below." />
          <div className="mt-6">
            <SelectWithLabel
              id="payment-method"
              label="E-wallet or Bank"
              required
              value={paymentMethodId || null}
              options={paymentMethods.map((method) => ({ value: String(method.id), label: method.name }))}
              placeholder={paymentMethodsQuery.isPending ? "Loading payment methods…" : "No payment method available"}
              error={form.formState.errors.payment_method_id?.message}
              disabled={paymentMethodsQuery.isPending || paymentMethodsQuery.isError || paymentMethods.length === 0}
              triggerClassName="rounded-xl bg-background px-4 font-heading text-base"
              contentClassName="rounded-xl p-1"
              onValueChange={(value) => {
                if (value && paymentMethods.some((method) => String(method.id) === value)) {
                  form.setValue("payment_method_id", value, { shouldDirty: true, shouldValidate: true });
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
            <div className="mt-5"><PaymentMethodDetails key={selectedPaymentMethod.id} method={selectedPaymentMethod} /></div>
          ) : (
            <p className="mt-4 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
              No payment method is currently available. Please contact Dinks on Us before submitting your reservation.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="payment-proof-title">
          <SectionHeading id="payment-proof-title" eyebrow="Payment proof" title="Submit your transaction details" description="Both the reference number and a clear receipt image are required for manual verification." />
          <div className="mt-6 grid gap-5">
            <InputWithLabel
              id="reference-number"
              label="Transaction reference number"
              required={paymentEvidenceEnabled}
              disabled={!paymentEvidenceEnabled}
              inputMode="numeric"
              placeholder="Enter the complete reference number"
              className="h-10 px-4"
              {...form.register("payment_reference_number")}
              error={form.formState.errors.payment_reference_number?.message}
            />
            <FormFieldWrapper
              id="payment-receipt"
              label="Payment receipt image"
              required={paymentEvidenceEnabled}
              error={form.formState.errors.payment_proof?.message}
            >
              <label htmlFor="payment-receipt" aria-disabled={!paymentEvidenceEnabled} className={`flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50 ${paymentEvidenceEnabled ? "cursor-pointer border-primary/50 bg-primary/5 hover:bg-primary/10" : "cursor-not-allowed border-border bg-muted/40 opacity-60"}`}>
                {paymentProof?.item(0) ? <FiImage className="size-7 text-primary" aria-hidden="true" /> : <FiUploadCloud className="size-7 text-primary" aria-hidden="true" />}
                <span className="mt-3 break-all font-heading font-extrabold">{paymentProof?.item(0)?.name || "Choose a receipt image"}</span>
                <span className="mt-1 text-xs leading-5 text-muted-foreground">JPG, PNG, or WEBP · clear and readable</span>
                <input
                  id="payment-receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={paymentEvidenceEnabled}
                  disabled={!paymentEvidenceEnabled}
                  className="sr-only"
                  aria-invalid={Boolean(form.formState.errors.payment_proof)}
                  aria-describedby={form.formState.errors.payment_proof ? "payment-receipt-error" : undefined}
                  {...form.register("payment_proof")}
                />
              </label>
            </FormFieldWrapper>
          </div>
        </section>

        <section className="rounded-2xl border border-primary/35 bg-card p-4 sm:p-7">
          <div className="flex items-start gap-3">
            <Checkbox
              id="acknowledgment"
              checked={acknowledged}
              onCheckedChange={(checked) => form.setValue("policy_acknowledged", checked === true, { shouldDirty: true, shouldValidate: true })}
              aria-invalid={Boolean(form.formState.errors.policy_acknowledged)}
              aria-describedby={form.formState.errors.policy_acknowledged ? "acknowledgment-error" : undefined}
              className="mt-1 size-5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <Label htmlFor="acknowledgment" className="block cursor-pointer font-heading text-base font-extrabold leading-6">
                Reservation acknowledgment <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">I reviewed the reservation summary and conditions. I confirm that my information and payment proof are accurate, and I understand that staff must verify the payment before the reservation is confirmed.</p>
            </div>
          </div>
          {form.formState.errors.policy_acknowledged?.message ? (
            <p id="acknowledgment-error" role="alert" className="mt-2 pl-8 text-xs leading-4 text-destructive">
              {form.formState.errors.policy_acknowledged.message}
            </p>
          ) : null}
          <div className="mt-4 ml-8 rounded-xl border border-border/80 bg-background/60 p-3 sm:mt-5 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Policy agreement</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">I have read and agree to:</p>
            <ul className="mt-2 grid gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1" aria-label="Reservation policy links">
              <li><ReservationPolicyDialog initialSlug="court-rules" triggerLabel="Court Rules & Policy" triggerVariant="link" triggerClassName="w-full justify-start whitespace-normal text-left text-sm leading-5 sm:w-auto" /></li>
              <li><ReservationPolicyDialog initialSlug="reservation-rules" triggerLabel="Reservation Rules & Policy" triggerVariant="link" triggerClassName="w-full justify-start whitespace-normal text-left text-sm leading-5 sm:w-auto" /></li>
              <li><ReservationPolicyDialog initialSlug="reschedule-policy" triggerLabel="Reschedule Policy" triggerVariant="link" triggerClassName="w-full justify-start whitespace-normal text-left text-sm leading-5 sm:w-auto" /></li>
              <li><ReservationPolicyDialog initialSlug="cancellation-policy" triggerLabel="Cancellation Policy" triggerVariant="link" triggerClassName="w-full justify-start whitespace-normal text-left text-sm leading-5 sm:w-auto" /></li>
            </ul>
          </div>
          <div className="mt-4 ml-8 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground sm:mt-5">
            <FiLock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>Your payment proof is intended only for reservation verification.</span>
          </div>
          <Button type="submit" disabled={!acknowledged || !selectedPaymentMethod || checkoutUnavailable || optionsQuery.isFetching || submitMutation.isPending || isMutationRateLimited(submitMutation)} className="mt-4 h-13 w-full rounded-full bg-energy px-5 font-extrabold text-energy-foreground hover:bg-energy/90 sm:mt-5">
            <FiShield aria-hidden="true" /> {mutationButtonLabel("Submitting reservation…", "Submit reservation", submitMutation)}
          </Button>
          {checkoutUnavailable ? (
            <p className="mt-3 text-center text-xs text-destructive">Update unavailable selections before submitting.</p>
          ) : !selectedPaymentMethod ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">A payment method must be available before submitting.</p>
          ) : !acknowledged ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">Check the acknowledgment above to enable submission.</p>
          ) : null}
        </section>
      </form>

      <Dialog
        open={emailConfirmationValues !== null}
        onOpenChange={(open) => {
          if (!open && !submitMutation.isPending) setEmailConfirmationValues(null);
        }}
      >
        <DialogContent showCloseButton={false} className="gap-5 p-6 sm:max-w-lg sm:p-8">
          <DialogHeader className="text-left">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-energy">One final check</p>
            <DialogTitle className="font-heading text-2xl font-extrabold tracking-[-.04em]">Is this email address correct?</DialogTitle>
            <DialogDescription className="leading-6">Your reservation result, including whether it is verified or rejected, will be sent to this address.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-primary/35 bg-primary/8 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Reservation email</p>
            <p className="mt-1 break-all font-heading text-lg font-extrabold text-primary">{emailConfirmationValues?.customer_email}</p>
          </div>
          <DialogFooter className="sm:grid sm:grid-cols-2 sm:gap-3">
            <DialogClose render={<Button type="button" variant="outline" disabled={submitMutation.isPending} className="h-12 rounded-full font-extrabold" />}>
              Edit email
            </DialogClose>
            <Button
              type="button"
              disabled={submitMutation.isPending || isMutationRateLimited(submitMutation) || checkoutUnavailable || optionsQuery.isFetching}
              className="h-12 rounded-full bg-energy font-extrabold text-energy-foreground hover:bg-energy/90"
              onClick={() => {
                if (emailConfirmationValues) void submitReservation(emailConfirmationValues);
              }}
            >
              <FiShield aria-hidden="true" /> {mutationButtonLabel("Submitting reservation…", "Yes, submit reservation", submitMutation)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
