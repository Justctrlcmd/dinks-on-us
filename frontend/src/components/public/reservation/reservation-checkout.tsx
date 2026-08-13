"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiFileText,
  FiImage,
  FiLock,
  FiShield,
  FiSmartphone,
  FiUploadCloud,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MOCK_RESERVATION_STORAGE_KEY,
  mockEquipment,
  type MockReservationDraft,
  type MockSlot,
} from "@/config/mock-reservation";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const paymentMethods = [
  { id: "gcash", name: "GCash", account: "Dinks on Us", detail: "Mobile account", accent: "bg-[#0879df] text-white" },
  { id: "maya", name: "Maya", account: "Dinks on Us", detail: "Mobile account", accent: "bg-[#171717] text-white" },
  { id: "bdo", name: "BDO", account: "Dinks on Us", detail: "Bank account", accent: "bg-[#174a8b] text-white" },
  { id: "gotyme", name: "GoTyme", account: "Dinks on Us", detail: "Mobile account", accent: "bg-[#16ad74] text-white" },
] as const;

const conditions = [
  "Court rental covers up to 8 players, with a maximum of 15 players per court.",
  "Each player beyond the included 8 players is charged ₱100.",
  "Guests and visitors have no entrance fee.",
  "Bring your own ball, or add a ball to your equipment rental.",
  "Party trays and group meals are subject to a ₱100 corkage fee per person.",
  "Outside alcoholic beverages are prohibited.",
] as const;

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatHour(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  return `${normalized % 12 || 12}:00 ${suffix}`;
}

function formatTimeRange(slot: MockSlot) {
  return `${formatHour(slot.startHour)} – ${formatHour(slot.endHour)}`;
}

function isReservationDraft(value: unknown): value is MockReservationDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<MockReservationDraft>;
  return Array.isArray(draft.selectedSlots) && Boolean(draft.equipmentQuantities);
}

const subscribeToNothing = () => () => {};

type SummaryGroup = {
  date: string;
  courts: Array<{ courtId: number; courtName: string; slots: MockSlot[] }>;
};

function groupSelectedSlots(slots: MockSlot[]): SummaryGroup[] {
  const byDate = new Map<string, Map<number, MockSlot[]>>();

  for (const slot of slots) {
    const courts = byDate.get(slot.date) ?? new Map<number, MockSlot[]>();
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

function BookingSummary({ draft }: { draft: MockReservationDraft }) {
  const groups = groupSelectedSlots(draft.selectedSlots);
  const courtSubtotal = draft.selectedSlots.reduce((total, slot) => total + slot.price, 0);
  const equipmentLines = mockEquipment
    .map((item) => ({ ...item, quantity: draft.equipmentQuantities[item.id] ?? 0 }))
    .filter((item) => item.quantity > 0);
  const equipmentSubtotal = equipmentLines.reduce((total, item) => total + item.price * item.quantity, 0);
  const total = courtSubtotal + equipmentSubtotal;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="booking-summary-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-energy">Booking summary</p>
          <h2 id="booking-summary-title" className="mt-2 font-heading text-xl font-extrabold tracking-[-.035em] sm:text-2xl">
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
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-heading font-extrabold uppercase tracking-[.08em]">{court.courtName}</p>
                    <p className="font-extrabold text-primary">{currency.format(court.slots.reduce((total, slot) => total + slot.price, 0))}</p>
                  </div>
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
      </div>

      <dl className="mt-5 grid gap-3 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Court rental</dt><dd className="font-bold">{currency.format(courtSubtotal)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Equipment rental</dt><dd className="font-bold">{currency.format(equipmentSubtotal)}</dd></div>
        <div className="flex items-end justify-between gap-4 border-t border-border pt-4"><dt className="font-heading text-lg font-extrabold">Amount to pay</dt><dd className="font-heading text-2xl font-extrabold text-primary">{currency.format(total)}</dd></div>
      </dl>
    </section>
  );
}

function ConditionsCard() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="conditions-title">
      <SectionHeading id="conditions-title" eyebrow="Conditions" title="Please review before paying" description="These mock policies will be replaced by the final court rules configured by management." />
      <ul className="mt-5 grid gap-3 text-sm leading-6 sm:text-base">
        {conditions.map((condition) => (
          <li key={condition} className="flex gap-3">
            <FiCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{condition}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex gap-3 rounded-xl border border-energy/35 bg-energy/8 p-4 text-sm leading-6">
        <FiAlertTriangle className="mt-1 size-4 shrink-0 text-energy" aria-hidden="true" />
        <p><strong>Important:</strong> Your selected slots are not held until the reservation is successfully submitted with complete payment proof.</p>
      </div>
    </section>
  );
}

function PaymentPlaceholder({ method }: { method: (typeof paymentMethods)[number] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white text-neutral-900">
      <div className={cn("flex items-center justify-between gap-3 px-4 py-3", method.accent)}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-current/75">Pay with</p>
          <p className="font-heading text-xl font-extrabold">{method.name}</p>
        </div>
        <FiSmartphone className="size-7" aria-hidden="true" />
      </div>
      <div className="grid justify-items-center gap-3 p-6 text-center">
        <div className="grid size-44 grid-cols-5 gap-1 rounded-xl border-8 border-neutral-900 bg-white p-3" aria-hidden="true">
          {Array.from({ length: 25 }, (_, index) => (
            <span key={index} className={cn("rounded-[2px]", (index * 7 + method.id.length) % 3 === 0 || [0, 1, 5, 6, 18, 19, 23, 24].includes(index) ? "bg-neutral-900" : "bg-neutral-200")} />
          ))}
        </div>
        <div>
          <p className="font-heading text-lg font-extrabold">Payment code placeholder</p>
          <p className="mt-1 text-sm text-neutral-600">{method.account} · {method.detail}</p>
        </div>
        <p className="max-w-sm text-xs leading-5 text-neutral-500">The manager-configured QR image and account identifier will appear here in the connected version.</p>
      </div>
    </div>
  );
}

export function ReservationCheckout() {
  const loaded = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const draft = useMemo(() => {
    if (!loaded) return null;

    try {
      const stored = window.sessionStorage.getItem(MOCK_RESERVATION_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : null;
      return isReservationDraft(parsed) && parsed.selectedSlots.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  }, [loaded]);
  const [paymentMethodId, setPaymentMethodId] = useState<(typeof paymentMethods)[number]["id"]>("gcash");
  const [receiptName, setReceiptName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === paymentMethodId) ?? paymentMethods[0],
    [paymentMethodId],
  );

  function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acknowledged) return;
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!loaded) {
    return <div className="mx-auto min-h-[40svh] max-w-5xl px-4 sm:px-10"><div className="h-64 animate-pulse rounded-2xl bg-muted" /></div>;
  }

  if (!draft) {
    return (
      <section className="mx-auto max-w-xl px-4 text-center sm:px-10">
        <div className="rounded-2xl border border-border bg-card p-7 sm:p-10">
          <FiFileText className="mx-auto size-10 text-primary" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-[-.04em]">No booking selected yet</h1>
          <p className="mt-3 leading-7 text-muted-foreground">Choose at least one available court slot before completing your booking.</p>
          <Button nativeButton={false} className="mt-6 h-12 rounded-full px-6 font-extrabold" render={<Link href="/reserve" />}>
            <FiArrowLeft aria-hidden="true" /> Choose court times
          </Button>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-2xl px-4 text-center sm:px-10">
        <div className="rounded-2xl border border-primary/35 bg-card p-7 sm:p-12">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/12 text-primary"><FiCheckCircle className="size-8" aria-hidden="true" /></span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-energy">Mock submission complete</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-[-.045em]">Payment proof received</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-muted-foreground">Your reservation will be held while staff reviews the submitted payment. The connected backend will provide the final booking reference here.</p>
          <Button nativeButton={false} variant="outline" className="mt-7 h-12 rounded-full px-6 font-extrabold" render={<Link href="/" />}>Return home</Button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-10">
      <header className="mb-6">
        <Link href="/reserve" className="inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <FiArrowLeft aria-hidden="true" /> Back to availability
        </Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[.18em] text-energy">Final booking step</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-[-.05em] sm:text-5xl">Complete <span className="text-primary">booking</span></h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Review your costs, add your details, then send payment proof for staff verification.</p>
      </header>

      <form className="grid min-w-0 gap-5" onSubmit={submitReservation}>
        <BookingSummary draft={draft} />
        <ConditionsCard />

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="customer-information-title">
          <SectionHeading id="customer-information-title" eyebrow="Your information" title="Who is making this reservation?" description="We will use these details for the booking acknowledgment and payment review." />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="full-name" className="font-bold">Full name</Label>
              <Input id="full-name" name="fullName" autoComplete="name" required placeholder="Enter your full name" className="h-12 px-4" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-bold">Email address</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="h-12 px-4" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobile" className="font-bold">Mobile number</Label>
              <Input id="mobile" name="mobile" type="tel" autoComplete="tel" required placeholder="+63 912 345 6789" className="h-12 px-4" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="payment-method-title">
          <SectionHeading id="payment-method-title" eyebrow="Payment method" title="Choose where you will pay" description="Select one method, complete the external transfer, then upload your receipt below." />
          <div className="mt-6 grid gap-2">
            <Label htmlFor="payment-method" className="font-bold">E-wallet or bank</Label>
            <Select
              name="paymentMethod"
              value={paymentMethodId}
              onValueChange={(value) => {
                if (value && paymentMethods.some((method) => method.id === value)) {
                  setPaymentMethodId(value as (typeof paymentMethods)[number]["id"]);
                }
              }}
            >
              <SelectTrigger id="payment-method" className="h-12 w-full rounded-xl bg-background px-4 font-heading text-base font-extrabold">
                <SelectValue>{selectedPaymentMethod.name}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start" className="rounded-xl p-1">
                {paymentMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id} className="min-h-11 rounded-lg px-3 font-semibold">
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-5"><PaymentPlaceholder method={selectedPaymentMethod} /></div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-7" aria-labelledby="payment-proof-title">
          <SectionHeading id="payment-proof-title" eyebrow="Payment proof" title="Submit your transaction details" description="Both the reference number and a clear receipt image are required for manual verification." />
          <div className="mt-6 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="reference-number" className="font-bold">Transaction reference number</Label>
              <Input id="reference-number" name="referenceNumber" required inputMode="numeric" placeholder="Enter the complete reference number" className="h-12 px-4" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-receipt" className="font-bold">Payment receipt image</Label>
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
              <strong className="block font-heading text-base">Booking acknowledgment</strong>
              <span className="mt-1 block font-normal text-muted-foreground">I reviewed the booking summary and conditions. I confirm that my information and payment proof are accurate, and I understand that staff must verify the payment before the reservation is confirmed.</span>
            </Label>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><FiLock aria-hidden="true" /> Your payment proof is intended only for reservation verification.</div>
          <Button type="submit" disabled={!acknowledged} className="mt-5 h-13 w-full rounded-full bg-energy px-5 font-extrabold text-energy-foreground hover:bg-energy/90">
            <FiShield aria-hidden="true" /> Submit reservation
          </Button>
          {!acknowledged ? <p className="mt-3 text-center text-xs text-muted-foreground">Check the acknowledgment above to enable submission.</p> : null}
        </section>
      </form>
    </div>
  );
}
