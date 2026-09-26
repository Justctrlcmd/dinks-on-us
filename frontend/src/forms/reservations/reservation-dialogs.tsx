"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FiChevronDown, FiPlus } from "react-icons/fi";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReservation } from "@/hooks/queries/use-reservations";
import { useHistoryReservation } from "@/hooks/queries/use-history";
import { useDashboardReservation } from "@/hooks/queries/use-dashboard";
import { useReservationOptions } from "@/hooks/queries/use-court-pricing";
import { usePublicPaymentMethods } from "@/hooks/queries/use-payment-methods";
import { useAddReservationAddOns, useCancelReservation, useCompleteReservation, useRejectReservation, useRescheduleReservation } from "@/hooks/mutations/use-reservation-mutations";
import { equipmentForSchedule } from "@/lib/equipment-availability";
import { formatDateOnly } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import { reservationProofUrl } from "@/services/reservations/reservation-service";
import type { ManagementReservation, ReservationAddOnsInput, RescheduleReservationInput } from "@/types/reservation";
import { PaymentMethodQrDialog } from "@/components/common/payment-method-qr-dialog";
import {
  expandReservationRanges as expandRanges,
  ReservationQuantityStepper as QuantityStepper,
  ReservationScheduleFields as ScheduleFields,
} from "@/forms/reservations/reservation-form-controls";
import {
  cancelReservationSchema,
  completeReservationSchema,
  rejectReservationSchema,
  reservationAddOnsSchema,
  rescheduleReservationSchema,
  type CancelReservationValues,
  type CompleteReservationValues,
  type RejectReservationValues,
  type ReservationAddOnsValues,
  type RescheduleReservationValues,
} from "@/validation/custom/reservation-management-schema";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const emptyEquipment: Record<string, number> = {};
const concernOptions = [
  ["INVALID_PAYMENT_PROOF", "Invalid payment proof"], ["UNVERIFIABLE_REFERENCE", "Unverifiable transaction reference"],
  ["INCORRECT_AMOUNT", "Incorrect payment amount"], ["DUPLICATE_OR_SUSPICIOUS_PAYMENT", "Duplicate or suspicious payment"],
  ["RESERVATION_INFORMATION_ISSUE", "Reservation information issue"], ["OTHER", "Other"],
] as const;

const paymentKindCopy: Record<string, { label: string; description: string }> = {
  INITIAL: {
    label: "Original reservation payment",
    description: "Payment submitted with the original reservation.",
  },
  ADD_ON: {
    label: "Add-on payment",
    description: "Payment recorded for added court time, players, or equipment.",
  },
  RESCHEDULE: {
    label: "Reschedule payment",
    description: "Payment recorded for the updated schedule and any reschedule add-ons.",
  },
  SETTLEMENT: {
    label: "Final balance payment",
    description: "Remaining balance collected when the reservation was completed.",
  },
};

function Field({ label, htmlFor, required, error, children }: { label: string; htmlFor?: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label htmlFor={htmlFor}>{label}{required ? <span aria-hidden="true"> *</span> : null}</Label>{children}{error ? <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs leading-4 text-destructive">{error}</p> : null}</div>;
}

function SummaryLine({ label, amount, labelClassName, amountClassName }: { label: React.ReactNode; amount: number; labelClassName?: string; amountClassName?: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2.5 text-sm">
      <span className={`min-w-0 leading-6 ${labelClassName ?? ""}`}>{label}</span>
      <strong className={`shrink-0 whitespace-nowrap text-right font-heading font-bold tabular-nums ${amountClassName ?? ""}`}>{currency.format(amount)}</strong>
    </div>
  );
}

function ReservationActionConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  pending,
  disabled = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  pending: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}>
    <DialogContent showCloseButton={!pending}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <div className="rounded-lg border bg-muted/20 p-3 text-sm">{children}</div>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Back</Button>
        <Button type="button" variant={destructive ? "destructive" : "default"} disabled={pending || disabled} onClick={onConfirm}>{confirmLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function ReservationDetailDialog({ reservation, reservationId, open, onOpenChange, source = "reservations" }: { reservation: ManagementReservation | null; reservationId?: number | null; open: boolean; onOpenChange: (open: boolean) => void; source?: "reservations" | "history" | "dashboard" }) {
  const targetId = reservation?.id ?? reservationId ?? null;
  const reservationDetail = useReservation(source === "reservations" && open ? targetId : null);
  const historyDetail = useHistoryReservation(source === "history" && open ? targetId : null);
  const dashboardDetail = useDashboardReservation(source === "dashboard" && open ? targetId : null);
  const detail = source === "history" ? historyDetail : source === "dashboard" ? dashboardDetail : reservationDetail;
  const item = detail.data ?? reservation;
  const originalSlots = item?.slots?.filter((slot) => slot.kind !== "ADD_ON") ?? [];
  const addOnSlots = item?.slots?.filter((slot) => slot.kind === "ADD_ON") ?? [];
  const originalEquipment = item?.equipment?.filter((equipment) => equipment.kind !== "ADD_ON") ?? [];
  const addOnEquipment = item?.equipment?.filter((equipment) => equipment.kind === "ADD_ON") ?? [];
  const addOnAdjustments = item?.adjustments?.filter((adjustment) => ["COURT_ADD_ON", "ADDITIONAL_PLAYER", "EQUIPMENT"].includes(adjustment.type)) ?? [];
  const addOnPlayers = addOnAdjustments.filter((adjustment) => adjustment.type === "ADDITIONAL_PLAYER");
  const addOnTotal = addOnAdjustments.reduce((total, adjustment) => total + adjustment.total_amount, 0);
  const addOnPayments = item?.payments?.filter((payment) => payment.kind === "ADD_ON" && payment.status === "VERIFIED") ?? [];
  const addOnPaid = addOnPayments.reduce((total, payment) => total + payment.amount, 0);
  const otherAdjustments = (item?.amounts.adjustments ?? 0) - addOnTotal;
  const hasAddOns = addOnSlots.length > 0 || addOnEquipment.length > 0 || addOnPlayers.length > 0 || addOnAdjustments.length > 0;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl">
    <DialogHeader><DialogTitle>Reservation details</DialogTitle><DialogDescription>{item ? `${item.reference_number} · ${item.display_status.replaceAll("_", " ")}` : "Loading reservation information…"}</DialogDescription></DialogHeader>
    {detail.isPending && !item ? <p className="py-8 text-center text-sm text-muted-foreground">Loading reservation details…</p> : item ? <div className="grid gap-5">
      <section className="rounded-xl border p-4"><h3 className="font-heading font-bold">Customer information</h3><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_1fr_1.1fr]"><div className="min-w-0"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{item.customer.name}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">Email</dt><dd className="break-all font-medium">{item.customer.email}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">Contact</dt><dd className="font-medium">{item.customer.contact_number}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">Source</dt><dd className="font-medium capitalize">{item.source.toLowerCase().replaceAll("_", "-")}</dd></div></dl></section>
      <section className="rounded-xl border p-4">
        <h3 className="font-heading font-bold">Original reservation summary</h3>
        <div className="mt-3 divide-y divide-border/80">
          {originalSlots.map((slot) => <SummaryLine key={slot.id} label={`${slot.court_name} · ${formatDateOnly(slot.date)} · ${formatHourRange(slot.start_hour, slot.end_hour)}`} amount={slot.amount} />)}
          {item.additional_players.original_quantity > 0 ? <SummaryLine label={`Additional players: ${item.additional_players.original_quantity} × ${currency.format(item.additional_players.unit_amount)}`} amount={item.additional_players.original_quantity * item.additional_players.unit_amount} /> : null}
          {originalEquipment.map((equipment) => <SummaryLine key={equipment.id} label={`${equipment.name}: ${equipment.quantity} × ${currency.format(equipment.unit_amount)}`} amount={equipment.total_amount} />)}
        </div>
        <dl className="mt-3 grid gap-2 border-t pt-3 text-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4">
            <dt className="text-muted-foreground">Original reservation total</dt>
            <dd className="whitespace-nowrap text-right font-heading text-lg font-extrabold tabular-nums">{currency.format(item.amounts.original)}</dd>
          </div>
        </dl>
      </section>
      {hasAddOns ? <>
      <section className="rounded-xl border p-4">
        <h3 className="font-heading font-bold">Paid add-ons</h3>
        <div className="mt-3 divide-y divide-border/80">
          {addOnSlots.map((slot) => <SummaryLine key={slot.id} label={`${slot.court_name} · ${formatDateOnly(slot.date)} · ${formatHourRange(slot.start_hour, slot.end_hour)}`} amount={slot.amount} />)}
          {addOnPlayers.map((adjustment) => <SummaryLine key={adjustment.id} label={`${adjustment.description}: ${adjustment.quantity} × ${currency.format(adjustment.unit_amount)}`} amount={adjustment.total_amount} />)}
          {addOnEquipment.map((equipment) => <SummaryLine key={equipment.id} label={`${equipment.name}: ${equipment.quantity} × ${currency.format(equipment.unit_amount)}`} amount={equipment.total_amount} />)}
        </div>
        <div className="mt-3 grid gap-2 border-t pt-3 text-sm">
          <SummaryLine label="Total add-ons" amount={addOnTotal} />
          <SummaryLine label="Add-on payment recorded" amount={addOnPaid} labelClassName="text-primary" amountClassName="text-primary" />
        </div>
      </section>
      <section className="rounded-xl border p-4">
        <h3 className="font-heading font-bold">Updated total</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4"><dt className="text-muted-foreground">Original reservation</dt><dd className="whitespace-nowrap text-right font-bold tabular-nums">{currency.format(item.amounts.original)}</dd></div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4"><dt className="text-muted-foreground">Add-ons</dt><dd className="whitespace-nowrap text-right font-bold tabular-nums">{currency.format(addOnTotal)}</dd></div>
          {Math.abs(otherAdjustments) >= 0.01 ? <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4"><dt className="text-muted-foreground">Other adjustments</dt><dd className={`whitespace-nowrap text-right font-bold tabular-nums ${otherAdjustments < 0 ? "text-primary" : ""}`}>{currency.format(otherAdjustments)}</dd></div> : null}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4"><dt className="text-muted-foreground">Total paid</dt><dd className="whitespace-nowrap text-right font-bold tabular-nums">{currency.format(item.amounts.paid)}</dd></div>
        </dl>
        <div className="mt-4 border-t pt-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4"><span className="font-semibold">Updated reservation total</span><strong className="whitespace-nowrap text-right font-heading text-xl font-extrabold tabular-nums text-primary">{currency.format(item.amounts.final)}</strong></div>
          {item.amounts.outstanding > 0 ? <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">Outstanding balance: {currency.format(item.amounts.outstanding)}</p> : null}
          {item.amounts.refundable_credit > 0 ? <p className="mt-3 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary">Refundable credit: {currency.format(item.amounts.refundable_credit)}</p> : null}
        </div>
      </section>
      </> : null}
      <section className="rounded-xl border p-4">
        <h3 className="font-heading font-bold">Payment records and proofs</h3>
        <p className="mt-1 text-sm text-muted-foreground">Each payment is identified by what it covers.</p>
        <div className="mt-3 grid gap-3">
          {item.payments?.map((payment) => {
            const copy = paymentKindCopy[payment.kind] ?? {
              label: "Reservation payment",
              description: "Payment recorded for this reservation.",
            };
            return <article key={payment.id} className="grid gap-3 rounded-xl border bg-muted/15 p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div>
                  <h4 className="font-heading font-bold text-primary">{copy.label}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">{copy.description}</p>
                </div>
                <p className="whitespace-nowrap text-right font-heading font-bold tabular-nums">{currency.format(payment.amount)}</p>
              </div>
              <dl className="grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Method</dt><dd className="font-medium">{payment.method ?? payment.channel}</dd></div>
                <div><dt className="text-muted-foreground">Reference</dt><dd className="font-medium">{payment.reference_number ?? "Not provided"}</dd></div>
              </dl>
              {payment.proof_url ? <Image unoptimized width={900} height={600} src={reservationProofUrl(payment.proof_url)} alt={`${copy.label} proof for ${item.reference_number}`} className="max-h-80 w-full rounded-lg border object-contain" /> : <p className="text-sm text-muted-foreground">No proof image was provided for this payment.</p>}
            </article>;
          })}
        </div>
      </section>
    </div> : <p className="py-8 text-center text-sm text-destructive">Reservation details could not be loaded.</p>}
    <DialogFooter><DialogClose render={<Button variant="outline">Close</Button>} /></DialogFooter>
  </DialogContent></Dialog>;
}

export function RejectReservationDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useRejectReservation();
  const [pendingValues, setPendingValues] = useState<RejectReservationValues | null>(null);
  const form = useForm<RejectReservationValues>({
    resolver: zodResolver(rejectReservationSchema),
    defaultValues: { concern: concernOptions[0][0], reason: "" },
  });
  const concern = useWatch({ control: form.control, name: "concern" });

  useEffect(() => {
    if (open) form.reset({ concern: concernOptions[0][0], reason: "" });
  }, [form, open, reservation?.id]);

  const submit = form.handleSubmit((values) => setPendingValues(values));
  function confirm() {
    if (!reservation || !pendingValues) return;
    mutation.mutate(
      { id: reservation.id, concern: pendingValues.concern, reason: pendingValues.reason },
      { onSuccess: () => { setPendingValues(null); onOpenChange(false); }, onError: () => setPendingValues(null) },
    );
  }
  const reasonError = form.formState.errors.reason?.message;

  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-5"><DialogHeader><DialogTitle>Reject {reservation?.reference_number}?</DialogTitle><DialogDescription>This finalizes the reservation and immediately releases its court times.</DialogDescription></DialogHeader>
    <SelectWithLabel id="reservation-concern" label="Concern" required value={concern} error={form.formState.errors.concern?.message} options={concernOptions.map(([value, label]) => ({ value, label }))} onValueChange={(value) => { if (value) form.setValue("concern", value as RejectReservationValues["concern"], { shouldDirty: true, shouldValidate: true }); }} />
    <Field label="Reason" htmlFor="reservation-rejection-reason" required error={reasonError}><Textarea id="reservation-rejection-reason" aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "reservation-rejection-reason-error" : undefined} {...form.register("reason")} maxLength={1500} rows={5} placeholder="Explain why this reservation cannot be accepted." /></Field>
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Keep reservation</Button>} /><Button type="submit" variant="destructive" disabled={mutation.isPending || isMutationRateLimited(mutation)}>Review rejection</Button></DialogFooter>
  </form></DialogContent></Dialog>
  <ReservationActionConfirmationDialog
    open={Boolean(pendingValues)}
    onOpenChange={(nextOpen) => { if (!nextOpen) setPendingValues(null); }}
    title={`Reject ${reservation?.reference_number}?`}
    description="This cannot be reversed. The reservation will be finalized and its court times released."
    confirmLabel={mutationButtonLabel("Rejecting…", "Reject reservation", mutation)}
    destructive
    pending={mutation.isPending}
    disabled={isMutationRateLimited(mutation)}
    onConfirm={confirm}
  >
    <dl className="grid gap-2"><div><dt className="text-muted-foreground">Concern</dt><dd className="font-medium">{concernOptions.find(([value]) => value === pendingValues?.concern)?.[1] ?? "Not specified"}</dd></div><div><dt className="text-muted-foreground">Reason</dt><dd className="whitespace-pre-wrap font-medium">{pendingValues?.reason}</dd></div></dl>
  </ReservationActionConfirmationDialog></>;
}

function RescheduleForm({ reservation, onDone }: { reservation: ManagementReservation; onDone: () => void }) {
  const initialRanges = [{ courtId: "", slots: [] }];
  const requiredCount = reservation.slots?.filter((slot) => slot.kind !== "ADD_ON").length ?? 0;
  const mutation = useRescheduleReservation();
  const [addOnsOpen, setAddOnsOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<RescheduleReservationInput | null>(null);
  const detailQuery = useReservation(reservation.id);
  const detail = detailQuery.data ?? reservation;
  const form = useForm<RescheduleReservationValues>({
    resolver: zodResolver(rescheduleReservationSchema(requiredCount)),
    defaultValues: {
      date: reservation.booking_date,
      ranges: initialRanges,
      add_on_ranges: initialRanges,
      additional_players: 0,
      equipment: {},
      payment_channel: null,
      payment_method_id: undefined,
      payment_reference_number: "",
      payment_proof: undefined,
    },
  });
  const date = useWatch({ control: form.control, name: "date" }) ?? reservation.booking_date;
  const ranges = useWatch({ control: form.control, name: "ranges" }) ?? initialRanges;
  const addOnRanges = useWatch({ control: form.control, name: "add_on_ranges" }) ?? initialRanges;
  const players = useWatch({ control: form.control, name: "additional_players" }) ?? 0;
  const watchedEquipment = useWatch({ control: form.control, name: "equipment" });
  const equipment = watchedEquipment ?? emptyEquipment;
  const paymentChannel = useWatch({ control: form.control, name: "payment_channel" }) ?? null;
  const paymentMethodId = useWatch({ control: form.control, name: "payment_method_id" });
  const paymentReference = useWatch({ control: form.control, name: "payment_reference_number" }) ?? "";
  const paymentProof = useWatch({ control: form.control, name: "payment_proof" });
  const paymentMethodsQuery = usePublicPaymentMethods();
  const paymentMethods = paymentMethodsQuery.data ?? [];
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === paymentMethodId) ?? null;
  const paymentSelection = paymentChannel === "CASH" ? "CASH" : paymentMethodId ? `METHOD:${paymentMethodId}` : null;
  const selectedSlots = useMemo(() => expandRanges(date, ranges), [date, ranges]);
  const selectedAddOnSlots = useMemo(() => expandRanges(date, addOnRanges), [date, addOnRanges]);
  const preservedAddOnSlots = (detail.slots ?? []).filter((slot) => slot.kind === "ADD_ON");
  const optionHours = [...preservedAddOnSlots, ...selectedSlots, ...selectedAddOnSlots].map((slot) => slot.start_hour);
  const rawOptions = useReservationOptions(date, optionHours, "management").data;
  const options = useMemo(() => {
    if (!rawOptions) return undefined;
    const currentSlots = new Set((detail.slots ?? []).map((slot) => `${slot.date}-${slot.start_hour}`));
    const adjusted = {
      ...rawOptions,
      equipment: rawOptions.equipment.map((item) => {
        const held = (detail.equipment ?? []).filter((allocation) => allocation.equipment_id === item.id).reduce((sum, allocation) => sum + allocation.quantity, 0);
        return { ...item, slot_availability: item.slot_availability?.map((slot) => ({
          ...slot,
          available_quantity: Math.max(0, slot.available_quantity - (currentSlots.has(`${slot.date}-${slot.start_hour}`) ? 0 : held)),
        })) };
      }),
    };
    return { ...adjusted, equipment: equipmentForSchedule(adjusted, [...new Set([...preservedAddOnSlots.map((slot) => slot.start_hour), ...selectedSlots.map((slot) => slot.start_hour), ...selectedAddOnSlots.map((slot) => slot.start_hour)])]) };
  }, [detail, preservedAddOnSlots, rawOptions, selectedAddOnSlots, selectedSlots]);
  useEffect(() => {
    if (!options) return;
    const corrected = Object.fromEntries(Object.entries(equipment).map(([id, quantity]) => [id, Math.min(quantity, options.equipment.find((item) => item.id === Number(id))?.available_quantity ?? 0)]));
    if (JSON.stringify(corrected) !== JSON.stringify(equipment)) form.setValue("equipment", corrected, { shouldDirty: true, shouldValidate: true });
  }, [equipment, form, options]);
  const replacementDetails = selectedSlots.map((slot) => {
    const option = options?.slots.find((candidate) => candidate.start_hour === slot.start_hour);
    const court = options?.courts.find((candidate) => candidate.id === slot.court_id);
    return { ...slot, courtName: court?.name ?? `Court ${slot.court_id}`, endHour: option?.end_hour ?? slot.start_hour + 1, amount: Number(option?.price ?? 0) };
  });
  const addOnDetails = selectedAddOnSlots.map((slot) => {
    const option = options?.slots.find((candidate) => candidate.start_hour === slot.start_hour);
    const court = options?.courts.find((candidate) => candidate.id === slot.court_id);
    return { ...slot, courtName: court?.name ?? `Court ${slot.court_id}`, endHour: option?.end_hour ?? slot.start_hour + 1, amount: Number(option?.price ?? 0) };
  });
  const migratedAddOnDetails = preservedAddOnSlots.map((slot) => {
    const option = options?.slots.find((candidate) => candidate.start_hour === slot.start_hour);
    const court = options?.courts.find((candidate) => candidate.id === slot.court_id);
    return { ...slot, date, courtName: court?.name ?? slot.court_name, endHour: option?.end_hour ?? slot.end_hour, amount: Number(option?.price ?? slot.amount) };
  });
  const selectedEquipment = (options?.equipment ?? []).filter((item) => (equipment[item.id] ?? 0) > 0);
  const originalSlots = (detail.slots ?? []).filter((slot) => slot.kind !== "ADD_ON");
  const originalSlotAmount = originalSlots.reduce((total, slot) => total + slot.amount, 0);
  const replacementAmount = replacementDetails.reduce((total, slot) => total + slot.amount, 0);
  const oldAddOnSlotAmount = preservedAddOnSlots.reduce((total, slot) => total + slot.amount, 0);
  const migratedAddOnSlotAmount = migratedAddOnDetails.reduce((total, slot) => total + slot.amount, 0);
  const migratedAddOnUnavailable = options ? preservedAddOnSlots.some((slot) => {
    const courtExists = options.courts.some((court) => court.id === slot.court_id);
    const periodExists = options.slots.some((period) => period.start_hour === slot.start_hour);
    if (!courtExists || !periodExists || options.is_date_closed) return true;
    const unavailable = options.unavailable_slots.some((item) => item.court_id === slot.court_id && item.start_hour === slot.start_hour);
    const past = options.past_slots.some((item) => item.court_id === slot.court_id && item.start_hour === slot.start_hour);
    return past || (date !== slot.date && unavailable);
  }) : false;
  const addOnSlotAmount = addOnDetails.reduce((total, slot) => total + slot.amount, 0);
  const playerAmount = players * (options?.configuration?.additional_player_price ?? 0);
  const equipmentAmount = selectedEquipment.reduce((total, item) => total + (equipment[item.id] ?? 0) * item.price, 0);
  const addOnAmount = addOnSlotAmount + playerAmount + equipmentAmount;
  const updatedTotal = (detail.amounts.final ?? 0) + (replacementAmount + migratedAddOnSlotAmount - originalSlotAmount - oldAddOnSlotAmount) + addOnAmount;
  const amountToPay = Math.max(0, updatedTotal - (detail.amounts.paid ?? 0));
  const resultingCredit = Math.max(0, (detail.amounts.paid ?? 0) - updatedTotal);
  const slotCount = selectedSlots.length;
  const scheduleComplete = slotCount === requiredCount && ranges.every((range) => Boolean(range.courtId) && range.slots.length > 0);
  const addOnRangesComplete = addOnRanges.every((range) => (!range.courtId && range.slots.length === 0) || (Boolean(range.courtId) && range.slots.length > 0));
  const selectedKeys = [
    ...preservedAddOnSlots.map((slot) => `${slot.court_id}-${slot.start_hour}`),
    ...ranges.concat(addOnRanges).filter((range) => range.courtId && range.slots.length > 0).flatMap((range) => range.slots.map((slot) => `${range.courtId}-${slot}`)),
  ];
  const hasDuplicateSelection = new Set(selectedKeys).size !== selectedKeys.length;
  const pricingReady = Boolean(options);
  const paymentRequired = pricingReady && scheduleComplete && addOnRangesComplete && amountToPay > 0;
  const nonCashPayment = paymentChannel === "EWALLET_BANK" && Boolean(paymentMethodId);
  const paymentComplete = !paymentRequired || paymentChannel === "CASH" || (nonCashPayment && Boolean(paymentReference.trim()) && Boolean(paymentProof?.item(0)));
  const canSubmit = scheduleComplete && addOnRangesComplete && !hasDuplicateSelection && !migratedAddOnUnavailable && Boolean(options) && paymentComplete && !mutation.isPending;
  const submit = form.handleSubmit((values) => {
    if (!reservation || (amountToPay > 0 && !paymentComplete)) {
      if (amountToPay > 0 && !paymentChannel) form.setError("payment_channel", { message: "Choose how the outstanding balance was collected." });
      return;
    }
    const proof = values.payment_proof?.item(0);
    const input: RescheduleReservationInput = {
      slots: expandRanges(values.date, values.ranges ?? []),
      add_on_slots: expandRanges(values.date, values.add_on_ranges ?? []),
      additional_players: values.additional_players ?? 0,
      equipment: Object.entries(values.equipment ?? {}).filter(([, quantity]) => quantity > 0).map(([id, quantity]) => ({ id: Number(id), quantity })),
      ...(amountToPay > 0 && values.payment_channel ? {
        payment_channel: values.payment_channel,
        payment_method_id: values.payment_method_id,
        payment_reference_number: values.payment_reference_number?.trim() || undefined,
        payment_proof: proof && proof.size > 0 ? proof : undefined,
      } : {}),
    };
    setPendingInput(input);
  });
  function confirm() {
    if (!pendingInput) return;
    mutation.mutate(
      { id: reservation.id, input: pendingInput },
      { onSuccess: () => { setPendingInput(null); onDone(); }, onError: () => setPendingInput(null) },
    );
  }
  const scheduleError = form.formState.errors.date?.message ?? form.formState.errors.ranges?.message;
  const addOnScheduleError = form.formState.errors.add_on_ranges?.message ?? (form.formState.errors.add_on_ranges ? "Complete each added court time." : undefined);
  const paymentError = form.formState.errors.payment_channel?.message ?? form.formState.errors.payment_method_id?.message;
  const oldBaseSlots = originalSlots.map((slot) => ({ court_id: slot.court_id, start_hour: slot.start_hour, date: slot.date }));
  return <><form onSubmit={submit} noValidate className="grid gap-5"><DialogHeader><DialogTitle>Reschedule {reservation.reference_number}?</DialogTitle><DialogDescription>Choose exactly {requiredCount} replacement slots. Existing add-on court times move to the new date at their same court and hour, using the current configured price. Players and equipment stay on this reservation.</DialogDescription></DialogHeader>
    <ScheduleFields idPrefix="reservation-replacement" date={date} setDate={(nextDate) => form.setValue("date", nextDate, { shouldDirty: true, shouldValidate: true })} ranges={ranges} setRanges={(nextRanges) => form.setValue("ranges", nextRanges, { shouldDirty: true, shouldValidate: true })} allowedCurrentSlots={oldBaseSlots} disableClosedDates={false} maxSelectedSlots={requiredCount} onRemoveRange={(index) => form.setValue("ranges", ranges.filter((_, rangeIndex) => rangeIndex !== index), { shouldDirty: true, shouldValidate: true })} error={scheduleError} />
    <Button type="button" variant="link" size="sm" className="h-auto w-fit px-0" disabled={slotCount >= requiredCount} onClick={() => form.setValue("ranges", [...ranges, { courtId: "", slots: [] }], { shouldDirty: true, shouldValidate: true })}><FiPlus aria-hidden="true" />Add another court</Button>
    <p className={slotCount === requiredCount ? "text-sm font-semibold text-primary" : "text-sm font-semibold text-destructive"}>{slotCount} of {requiredCount} replacement slots selected</p>
    {hasDuplicateSelection ? <p role="alert" className="text-sm font-semibold text-destructive">A replacement or new add-on overlaps an existing add-on court time.</p> : null}
    {migratedAddOnUnavailable ? <p role="alert" className="text-sm font-semibold text-destructive">An existing add-on court time is unavailable on the new date. Choose another date before rescheduling.</p> : null}
    <section className="rounded-xl border"><button type="button" className="flex min-h-12 w-full items-center justify-between gap-4 px-4 text-left font-semibold" aria-expanded={addOnsOpen} onClick={() => setAddOnsOpen((open) => !open)}><span>Add-ons for the new schedule?</span><FiChevronDown className={`shrink-0 transition-transform ${addOnsOpen ? "rotate-180" : ""}`} aria-hidden="true" /></button>{addOnsOpen ? <div className="grid gap-4 border-t p-4"><p className="text-sm text-muted-foreground">Add court time, players, or rental equipment to the same reservation.</p><ScheduleFields idPrefix="reservation-reschedule-addon" date={date} setDate={() => undefined} showDate={false} ranges={addOnRanges} setRanges={(nextRanges) => form.setValue("add_on_ranges", nextRanges, { shouldDirty: true, shouldValidate: true })} disableClosedDates={false} onRemoveRange={(index) => form.setValue("add_on_ranges", addOnRanges.filter((_, rangeIndex) => rangeIndex !== index), { shouldDirty: true, shouldValidate: true })} error={addOnScheduleError} /><Button type="button" variant="link" size="sm" className="h-auto w-fit px-0" onClick={() => form.setValue("add_on_ranges", [...addOnRanges, { courtId: "", slots: [] }], { shouldDirty: true, shouldValidate: true })}><FiPlus aria-hidden="true" />Add another add-on court</Button><div className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><h4 className="font-semibold">Additional players</h4><p className="text-sm text-muted-foreground">{currency.format(options?.configuration?.additional_player_price ?? 0)} each</p></div><QuantityStepper value={players} decreaseDisabled={players === 0} increaseDisabled={false} decreaseLabel="Remove one additional player" increaseLabel="Add one additional player" onDecrease={() => form.setValue("additional_players", Math.max(0, players - 1), { shouldDirty: true, shouldValidate: true })} onIncrease={() => form.setValue("additional_players", players + 1, { shouldDirty: true, shouldValidate: true })} /></div><div className="rounded-xl border p-4"><h4 className="font-semibold">Rental equipment</h4><div className="mt-3 grid gap-3">{options?.equipment.map((item) => { const quantity = equipment[item.id] ?? 0; return <div key={item.id} className="flex items-center justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{currency.format(item.price)} · {item.available_quantity === 0 ? "Unavailable for selected schedule" : `${item.available_quantity} available for your selected schedule`}</p></div><QuantityStepper value={quantity} decreaseDisabled={quantity === 0} increaseDisabled={quantity >= item.available_quantity} decreaseLabel={`Remove one ${item.name}`} increaseLabel={`Add one ${item.name}`} onDecrease={() => form.setValue("equipment", { ...equipment, [item.id]: Math.max(0, quantity - 1) }, { shouldDirty: true, shouldValidate: true })} onIncrease={() => form.setValue("equipment", { ...equipment, [item.id]: quantity + 1 }, { shouldDirty: true, shouldValidate: true })} /></div>; })}</div></div></div> : null}</section>
    {scheduleComplete && addOnRangesComplete && pricingReady ? <section className="rounded-xl border p-4"><h3 className="font-semibold">Updated balance</h3><div className="mt-3 grid gap-2 text-sm">{replacementDetails.map((slot) => <div key={`replacement-${slot.court_id}-${slot.start_hour}`} className="flex justify-between gap-3"><span>{slot.courtName} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}{migratedAddOnDetails.map((slot) => <div key={`migrated-add-on-${slot.court_id}-${slot.start_hour}`} className="flex justify-between gap-3"><span>Existing add-on moved · {slot.courtName} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}{addOnDetails.map((slot) => <div key={`add-on-${slot.court_id}-${slot.start_hour}`} className="flex justify-between gap-3"><span>New add-on · {slot.courtName} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}{players > 0 ? <div className="flex justify-between gap-3"><span>Additional players · {players}</span><strong>{currency.format(playerAmount)}</strong></div> : null}{selectedEquipment.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.name} · {equipment[item.id] ?? 0}</span><strong>{currency.format((equipment[item.id] ?? 0) * item.price)}</strong></div>)}<div className="mt-2 grid gap-2 border-t pt-3"><div className="flex justify-between gap-3"><span>Current reservation total</span><strong>{currency.format(detail.amounts.final)}</strong></div>{detail.amounts.outstanding > 0 ? <div className="flex justify-between gap-3 text-muted-foreground"><span>Current outstanding balance</span><strong>{currency.format(detail.amounts.outstanding)}</strong></div> : null}<div className="flex justify-between gap-3"><span>Updated reservation total</span><strong>{currency.format(updatedTotal)}</strong></div>{amountToPay > 0 ? <div className="flex justify-between gap-3 text-base font-extrabold text-destructive"><span>Balance to collect now</span><strong>{currency.format(amountToPay)}</strong></div> : resultingCredit > 0 ? <div className="flex justify-between gap-3 text-base font-extrabold text-primary"><span>Refundable credit</span><strong>{currency.format(resultingCredit)}</strong></div> : <div className="flex justify-between gap-3 font-semibold text-primary"><span>No balance difference</span><strong>{currency.format(0)}</strong></div>}</div></div></section> : null}
    {paymentRequired ? <section className="grid gap-4 rounded-xl border p-4"><div><h3 className="font-semibold">Payment method</h3><p className="text-sm text-muted-foreground">Collect the full outstanding balance after this reschedule.</p></div><SelectWithLabel id="reservation-reschedule-payment-method" label="Payment method" required value={paymentSelection} error={paymentError} options={[{ value: "CASH", label: "Cash" }, ...paymentMethods.map((method) => ({ value: `METHOD:${method.id}`, label: method.name }))]} placeholder="Select payment method" onValueChange={(value) => { if (!value) return; if (value === "CASH") { form.setValue("payment_channel", "CASH", { shouldDirty: true, shouldValidate: true }); form.setValue("payment_method_id", undefined, { shouldDirty: true, shouldValidate: true }); form.setValue("payment_reference_number", "", { shouldDirty: true, shouldValidate: true }); form.resetField("payment_proof", { defaultValue: undefined }); } else { form.setValue("payment_channel", "EWALLET_BANK", { shouldDirty: true, shouldValidate: true }); form.setValue("payment_method_id", Number(value.replace("METHOD:", "")), { shouldDirty: true, shouldValidate: true }); } }} description={paymentMethodsQuery.isPending ? "Loading active e-wallet and bank methods…" : "Cash or an active payment account."} />{paymentMethodsQuery.isError ? <p role="alert" className="text-sm text-destructive">Online payment methods could not be loaded. Cash remains available.</p> : null}{selectedPaymentMethod ? <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm"><dl className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Account name</dt><dd className="font-medium">{selectedPaymentMethod.account_name}</dd></div><div><dt className="text-muted-foreground">Account number</dt><dd className="font-medium">{selectedPaymentMethod.account_number}</dd></div></dl><PaymentMethodQrDialog method={selectedPaymentMethod} /></div> : null}<Field label="Transaction number" required={nonCashPayment} error={form.formState.errors.payment_reference_number?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_reference_number)} required={nonCashPayment} disabled={!nonCashPayment} {...form.register("payment_reference_number")} /></Field><Field label="Payment proof" required={nonCashPayment} error={form.formState.errors.payment_proof?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_proof)} required={nonCashPayment} disabled={!nonCashPayment} {...form.register("payment_proof")} type="file" accept="image/jpeg,image/png,image/webp" /></Field><div className="rounded-lg bg-muted/30 p-3 text-sm font-semibold"><div className="flex justify-between gap-3"><span>Balance to collect now</span><strong>{currency.format(amountToPay)}</strong></div></div></section> : null}
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Keep current schedule</Button>} /><Button type="submit" disabled={!canSubmit || mutation.isPending || isMutationRateLimited(mutation)}>Review reschedule</Button></DialogFooter>
  </form>
  <ReservationActionConfirmationDialog
    open={Boolean(pendingInput)}
    onOpenChange={(nextOpen) => { if (!nextOpen) setPendingInput(null); }}
    title={`Reschedule ${reservation.reference_number}?`}
    description="This records a new schedule and any related payment or credit. Review the result before continuing."
    confirmLabel={mutationButtonLabel("Rescheduling…", "Confirm reschedule", mutation)}
    pending={mutation.isPending}
    disabled={isMutationRateLimited(mutation)}
    onConfirm={confirm}
  >
    <div className="grid gap-2"><p className="font-semibold">Replacement schedule</p>{replacementDetails.map((slot) => <div key={`confirm-replacement-${slot.court_id}-${slot.start_hour}`} className="flex justify-between gap-3"><span>{slot.courtName} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}{migratedAddOnDetails.map((slot) => <div key={`confirm-migrated-add-on-${slot.court_id}-${slot.start_hour}`} className="flex justify-between gap-3"><span>Existing add-on moved · {slot.courtName} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}{addOnDetails.map((slot) => <div key={`confirm-add-on-${slot.court_id}-${slot.start_hour}`} className="flex justify-between gap-3"><span>New add-on · {slot.courtName} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}{players > 0 ? <div className="flex justify-between gap-3"><span>Additional players · {players}</span><strong>{currency.format(playerAmount)}</strong></div> : null}{selectedEquipment.map((item) => <div key={`confirm-equipment-${item.id}`} className="flex justify-between gap-3"><span>{item.name} · {equipment[item.id] ?? 0}</span><strong>{currency.format((equipment[item.id] ?? 0) * item.price)}</strong></div>)}<div className="mt-1 grid gap-2 border-t pt-3"><div className="flex justify-between gap-3"><span>Updated total</span><strong>{currency.format(updatedTotal)}</strong></div>{amountToPay > 0 ? <div className="flex justify-between gap-3 font-semibold text-destructive"><span>Collect now</span><strong>{currency.format(amountToPay)}</strong></div> : resultingCredit > 0 ? <div className="flex justify-between gap-3 font-semibold text-primary"><span>Refundable credit</span><strong>{currency.format(resultingCredit)}</strong></div> : null}</div></div>
  </ReservationActionConfirmationDialog></>;
}

export function RescheduleReservationDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">{open && reservation ? <RescheduleForm key={`${reservation.id}-${reservation.reschedule_count}`} reservation={reservation} onDone={() => onOpenChange(false)} /> : null}</DialogContent></Dialog>;
}

export function AddOnsDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const date = reservation?.booking_date ?? "";
  const detail = useReservation(open ? reservation?.id ?? null : null).data;
  const paymentMethodsQuery = usePublicPaymentMethods();
  const paymentMethods = paymentMethodsQuery.data ?? [];
  const [courtOpen, setCourtOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<ReservationAddOnsInput | null>(null);
  const mutation = useAddReservationAddOns();
  const form = useForm<ReservationAddOnsValues>({
    resolver: zodResolver(reservationAddOnsSchema),
    defaultValues: { ranges: [{ courtId: "", slots: [] }], additional_players: 0, equipment: {}, payment_channel: null, payment_method_id: undefined, payment_reference_number: "", payment_proof: undefined },
  });
  const players = useWatch({ control: form.control, name: "additional_players" }) ?? 0;
  const equipment = useWatch({ control: form.control, name: "equipment", defaultValue: {} });
  const ranges = useWatch({ control: form.control, name: "ranges", defaultValue: [{ courtId: "", slots: [] }] });
  const paymentChannel = useWatch({ control: form.control, name: "payment_channel" }) ?? null;
  const paymentMethodId = useWatch({ control: form.control, name: "payment_method_id" });
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === paymentMethodId) ?? null;
  const paymentSelection = paymentChannel === "CASH" ? "CASH" : paymentMethodId ? `METHOD:${paymentMethodId}` : null;
  const nonCashPayment = paymentChannel === "EWALLET_BANK" && Boolean(paymentMethodId);
  const paymentReference = useWatch({ control: form.control, name: "payment_reference_number" }) ?? "";
  const paymentProof = useWatch({ control: form.control, name: "payment_proof" });
  useEffect(() => {
    if (open) {
      form.reset({ ranges: [{ courtId: "", slots: [] }], additional_players: 0, equipment: {}, payment_channel: null, payment_method_id: undefined, payment_reference_number: "", payment_proof: undefined });
    }
  }, [form, open, reservation?.id]);
  const selectedSlots = useMemo(() => expandRanges(date, ranges), [date, ranges]);
  const rawOptions = useReservationOptions(date, [...(detail?.slots ?? []).map((slot) => slot.start_hour), ...selectedSlots.map((slot) => slot.start_hour)], "management").data;
  const options = useMemo(() => {
    if (!rawOptions) return undefined;
    const currentHours = new Set((detail?.slots ?? []).map((slot) => slot.start_hour));
    const hours = [...currentHours, ...selectedSlots.map((slot) => slot.start_hour)];
    const adjusted = { ...rawOptions, equipment: rawOptions.equipment.map((item) => {
      const held = (detail?.equipment ?? []).filter((allocation) => allocation.equipment_id === item.id).reduce((sum, allocation) => sum + allocation.quantity, 0);
      return { ...item, slot_availability: item.slot_availability?.map((slot) => ({
        ...slot, available_quantity: Math.max(0, slot.available_quantity - (currentHours.has(slot.start_hour) ? 0 : held)),
      })) };
    }) };
    return { ...rawOptions, equipment: equipmentForSchedule(adjusted, detail ? hours : []) };
  }, [rawOptions, detail, selectedSlots]);
  useEffect(() => {
    if (!options || !detail) return;
    const corrected = Object.fromEntries(Object.entries(equipment).map(([id, quantity]) => [id, Math.min(quantity, options.equipment.find((item) => item.id === Number(id))?.available_quantity ?? 0)]));
    if (JSON.stringify(corrected) !== JSON.stringify(equipment)) form.setValue("equipment", corrected, { shouldValidate: true });
  }, [detail, equipment, form, options]);
  const selectedSlotDetails = selectedSlots.map((slot) => {
    const option = options?.slots.find((candidate) => candidate.start_hour === slot.start_hour);
    const court = options?.courts.find((candidate) => candidate.id === slot.court_id);
    return { ...slot, courtName: court?.name ?? "Court " + slot.court_id, endHour: option?.end_hour ?? slot.start_hour + 1, amount: Number(option?.price ?? 0) };
  });
  const selectedEquipment = (options?.equipment ?? []).filter((item) => (equipment[item.id] ?? 0) > 0);
  const slotAmount = selectedSlotDetails.reduce((total, slot) => total + slot.amount, 0);
  const playerAmount = players * (options?.configuration?.additional_player_price ?? 0);
  const equipmentAmount = selectedEquipment.reduce((total, item) => total + (equipment[item.id] ?? 0) * item.price, 0);
  const addOnAmount = slotAmount + playerAmount + equipmentAmount;
  const currentTotal = detail?.amounts.final ?? reservation?.amounts.final ?? 0;
  const currentBalance = Math.max(detail?.amounts.outstanding ?? reservation?.amounts.outstanding ?? 0, 0);
  const currentCredit = Math.max(detail?.amounts.refundable_credit ?? reservation?.amounts.refundable_credit ?? 0, 0);
  const updatedTotal = currentTotal + addOnAmount;
  const creditApplied = Math.min(currentCredit, addOnAmount + currentBalance);
  const remainingCredit = Math.max(0, currentCredit - creditApplied);
  const amountToPay = Math.max(0, addOnAmount + currentBalance - creditApplied);
  const requiresPayment = amountToPay > 0;
  const paymentComplete = !requiresPayment || paymentChannel === "CASH" || (nonCashPayment && Boolean(paymentReference.trim()) && Boolean(paymentProof?.item(0)));
  const hasInput = selectedSlots.length > 0 || players > 0 || selectedEquipment.length > 0;
  const submit = form.handleSubmit((values) => {
    if (!reservation) return;
    if (requiresPayment && !values.payment_channel) {
      form.setError("payment_channel", { message: "Choose a payment method." });
      return;
    }
    const selectedSlots = expandRanges(date, values.ranges);
    const selectedEquipment = (options?.equipment ?? []).filter((item) => (values.equipment[item.id] ?? 0) > 0);
    const proof = values.payment_proof?.item(0);
    const input: ReservationAddOnsInput = {
      slots: selectedSlots,
      additional_players: values.additional_players,
      equipment: selectedEquipment.map((item) => ({ id: item.id, quantity: values.equipment[item.id] ?? 0 })),
      payment_channel: values.payment_channel ?? undefined,
      payment_method_id: values.payment_method_id,
      payment_reference_number: values.payment_reference_number?.trim() || undefined,
      payment_proof: proof && proof.size > 0 ? proof : undefined,
    };
    setPendingInput(input);
  });
  function confirm() {
    if (!reservation || !pendingInput) return;
    mutation.mutate(
      { id: reservation.id, input: pendingInput },
      { onSuccess: () => { setPendingInput(null); onOpenChange(false); }, onError: () => setPendingInput(null) },
    );
  }
  const scheduleError = form.formState.errors.ranges?.message ?? (form.formState.errors.ranges ? "Complete each selected court time." : undefined);
  const paymentChannelError = form.formState.errors.payment_channel?.message;
  const paymentMethodError = form.formState.errors.payment_method_id?.message;
  return <><Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) setCourtOpen(false); onOpenChange(nextOpen); }}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl"><form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-4"><DialogHeader><DialogTitle>Add these items to {reservation?.reference_number}?</DialogTitle><DialogDescription>Add available court time, players, or rental equipment to this reservation. Added court time is limited to the reservation date.</DialogDescription></DialogHeader>
    <section className="rounded-xl border"><button type="button" className="flex min-h-12 w-full items-center justify-between px-4 font-semibold" onClick={() => setCourtOpen(!courtOpen)}>Add court time?<FiChevronDown className={courtOpen ? "rotate-180" : ""} aria-hidden /></button>{courtOpen ? <div className="border-t p-4"><ScheduleFields date={date} setDate={() => undefined} dateLocked ranges={ranges} setRanges={(nextRanges) => form.setValue("ranges", nextRanges, { shouldDirty: true, shouldValidate: true })} onRemoveRange={(index) => form.setValue("ranges", ranges.filter((_, rangeIndex) => rangeIndex !== index), { shouldDirty: true, shouldValidate: true })} error={scheduleError} /><Button type="button" variant="link" size="sm" className="mt-3 h-auto px-0" onClick={() => form.setValue("ranges", [...ranges, { courtId: "", slots: [] }], { shouldDirty: true, shouldValidate: true })}><FiPlus aria-hidden="true" />Add another court</Button></div> : null}</section>
    <section className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><h3 className="font-semibold">Add players</h3><p className="text-sm text-muted-foreground">{currency.format(options?.configuration?.additional_player_price ?? 0)} each</p></div><QuantityStepper value={players} decreaseDisabled={players === 0} increaseDisabled={false} decreaseLabel="Remove one additional player" increaseLabel="Add one additional player" onDecrease={() => form.setValue("additional_players", Math.max(0, players - 1), { shouldDirty: true, shouldValidate: true })} onIncrease={() => form.setValue("additional_players", players + 1, { shouldDirty: true, shouldValidate: true })} /></section>
    <section className="rounded-xl border p-4"><h3 className="font-semibold">Rental equipment</h3><div className="mt-3 grid gap-3">{options?.equipment.map((item) => { const quantity = equipment[item.id] ?? 0; return <div key={item.id} className="flex items-center justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{currency.format(item.price)} · {item.available_quantity === 0 ? "Unavailable for selected schedule" : `${item.available_quantity} available for your selected schedule`}</p></div><QuantityStepper value={quantity} decreaseDisabled={quantity === 0} increaseDisabled={quantity >= item.available_quantity} decreaseLabel={`Remove one ${item.name}`} increaseLabel={`Add one ${item.name}`} onDecrease={() => form.setValue("equipment", { ...equipment, [item.id]: Math.max(0, quantity - 1) }, { shouldDirty: true, shouldValidate: true })} onIncrease={() => form.setValue("equipment", { ...equipment, [item.id]: quantity + 1 }, { shouldDirty: true, shouldValidate: true })} /></div>; })}</div></section>
    {hasInput ? <>
      <section className="rounded-xl border p-4">
        <h3 className="font-semibold">Add-on breakdown</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {selectedSlotDetails.map((slot) => <div key={slot.court_id + "-" + slot.start_hour} className="flex justify-between gap-3"><span>{slot.courtName} · {formatDateOnly(slot.date)} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}
          {players > 0 ? <div className="flex justify-between gap-3"><span>Additional players · {players} × {currency.format(options?.configuration?.additional_player_price ?? 0)}</span><strong>{currency.format(playerAmount)}</strong></div> : null}
          {selectedEquipment.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.name} · {equipment[item.id] ?? 0} × {currency.format(item.price)}</span><strong>{currency.format((equipment[item.id] ?? 0) * item.price)}</strong></div>)}
          {currentBalance > 0 ? <div className="flex justify-between gap-3 text-muted-foreground"><span>Previous outstanding balance</span><strong>{currency.format(currentBalance)}</strong></div> : null}
          {creditApplied > 0 ? <div className="flex justify-between gap-3 text-primary"><span>Existing credit applied</span><strong>−{currency.format(creditApplied)}</strong></div> : null}
          {remainingCredit > 0 ? <div className="flex justify-between gap-3 text-primary"><span>Remaining refundable credit</span><strong>{currency.format(remainingCredit)}</strong></div> : null}
          <div className="mt-2 grid gap-2 border-t pt-3"><div className="flex justify-between gap-3"><span>Updated reservation total</span><strong>{currency.format(updatedTotal)}</strong></div><div className="flex justify-between gap-3 text-base font-extrabold text-primary"><span>Amount to pay now</span><strong>{currency.format(amountToPay)}</strong></div></div>
        </div>
      </section>
      {requiresPayment ? <section className="grid gap-4 rounded-xl border p-4">
        <div><h3 className="font-semibold">Payment method</h3><p className="text-sm text-muted-foreground">Record how the add-on amount was collected.</p></div>
        <SelectWithLabel id="reservation-addon-payment-method" label="Payment method" required value={paymentSelection} error={paymentMethodError ?? paymentChannelError} options={[{ value: "CASH", label: "Cash" }, ...paymentMethods.map((method) => ({ value: `METHOD:${method.id}`, label: method.name }))]} placeholder="Select payment method" onValueChange={(value) => {
          if (!value) return;
          if (value === "CASH") {
            form.setValue("payment_channel", "CASH", { shouldDirty: true, shouldValidate: true });
            form.setValue("payment_method_id", undefined, { shouldDirty: true, shouldValidate: true });
            form.setValue("payment_reference_number", "", { shouldDirty: true, shouldValidate: true });
            form.resetField("payment_proof", { defaultValue: undefined });
          } else {
            form.setValue("payment_channel", "EWALLET_BANK", { shouldDirty: true, shouldValidate: true });
            form.setValue("payment_method_id", Number(value.replace("METHOD:", "")), { shouldDirty: true, shouldValidate: true });
          }
        }} description={paymentMethodsQuery.isPending ? "Loading active e-wallet and bank methods…" : "Cash or an active payment account from the public checkout."} />
        {paymentMethodsQuery.isError ? <p role="alert" className="text-sm text-destructive">Active e-wallet and bank methods could not be loaded. Cash remains available.</p> : null}
        {selectedPaymentMethod ? <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm"><dl className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Account name</dt><dd className="font-medium">{selectedPaymentMethod.account_name}</dd></div><div><dt className="text-muted-foreground">Account number</dt><dd className="font-medium">{selectedPaymentMethod.account_number}</dd></div></dl><PaymentMethodQrDialog method={selectedPaymentMethod} /></div> : null}
        <Field label={nonCashPayment ? "Transaction number" : "Transaction number (optional)"} required={nonCashPayment} error={form.formState.errors.payment_reference_number?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_reference_number)} required={nonCashPayment} disabled={!nonCashPayment} {...form.register("payment_reference_number")} /></Field>
        <Field label={nonCashPayment ? "Payment proof" : "Payment proof (optional)"} required={nonCashPayment} error={form.formState.errors.payment_proof?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_proof)} required={nonCashPayment} disabled={!nonCashPayment} {...form.register("payment_proof")} type="file" accept="image/jpeg,image/png,image/webp" /></Field>
      </section> : <section className="rounded-xl border border-primary/35 bg-primary/8 p-4"><h3 className="font-semibold text-primary">Covered by available credit</h3><p className="mt-1 text-sm text-muted-foreground">No payment method, transaction number, or proof is required for these add-ons.</p></section>}
    </> : null}
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Cancel</Button>} /><Button type="submit" disabled={!hasInput || !paymentComplete || mutation.isPending || isMutationRateLimited(mutation)}>Review add-ons</Button></DialogFooter>
  </form></DialogContent></Dialog>
  <ReservationActionConfirmationDialog
    open={Boolean(pendingInput)}
    onOpenChange={(nextOpen) => { if (!nextOpen) setPendingInput(null); }}
    title={`Add items to ${reservation?.reference_number}?`}
    description="These additions and any payment record cannot be edited from this reservation."
    confirmLabel={mutationButtonLabel("Adding…", "Confirm add-ons", mutation)}
    pending={mutation.isPending}
    disabled={isMutationRateLimited(mutation)}
    onConfirm={confirm}
  >
    <div className="grid gap-2">{selectedSlotDetails.map((slot) => <div key={`confirm-${slot.court_id}-${slot.start_hour}`} className="flex justify-between gap-3"><span>{slot.courtName} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}{players > 0 ? <div className="flex justify-between gap-3"><span>Additional players · {players}</span><strong>{currency.format(playerAmount)}</strong></div> : null}{selectedEquipment.map((item) => <div key={`confirm-equipment-${item.id}`} className="flex justify-between gap-3"><span>{item.name} · {equipment[item.id] ?? 0}</span><strong>{currency.format((equipment[item.id] ?? 0) * item.price)}</strong></div>)}<div className="mt-1 grid gap-2 border-t pt-3">{creditApplied > 0 ? <div className="flex justify-between gap-3 text-primary"><span>Existing credit applied</span><strong>−{currency.format(creditApplied)}</strong></div> : null}<div className="flex justify-between gap-3"><span>Updated total</span><strong>{currency.format(updatedTotal)}</strong></div>{amountToPay > 0 ? <><div className="flex justify-between gap-3 font-semibold text-primary"><span>Record payment now</span><strong>{currency.format(amountToPay)}</strong></div><div className="text-muted-foreground">Payment method: {pendingInput?.payment_channel === "CASH" ? "Cash" : selectedPaymentMethod?.name ?? "E-wallet or bank"}</div></> : <div className="font-semibold text-primary">No payment is required.</div>}</div></div>
  </ReservationActionConfirmationDialog></>;
}

export function CompleteReservationDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useCompleteReservation();
  const [pendingInput, setPendingInput] = useState<FormData | null>(null);
  const requiresPayment = (reservation?.amounts.outstanding ?? 0) > 0;
  const form = useForm<CompleteReservationValues>({
    resolver: zodResolver(completeReservationSchema(requiresPayment)),
    defaultValues: { payment_channel: null, payment_reference_number: "", payment_proof: undefined },
  });
  const paymentChannel = useWatch({ control: form.control, name: "payment_channel" }) ?? null;

  useEffect(() => {
    if (open) form.reset({ payment_channel: null, payment_reference_number: "", payment_proof: undefined });
  }, [form, open, reservation?.id]);

  const submit = form.handleSubmit((values) => {
    if (!reservation) return;
    const input = new FormData();
    if (values.payment_channel) input.set("payment_channel", values.payment_channel);
    if (values.payment_reference_number) input.set("payment_reference_number", values.payment_reference_number);
    const proof = values.payment_proof?.item(0);
    if (proof && proof.size > 0) input.set("payment_proof", proof);
    setPendingInput(input);
  });
  function confirm() {
    if (!reservation || !pendingInput) return;
    mutation.mutate(
      { id: reservation.id, input: pendingInput },
      { onSuccess: () => { setPendingInput(null); onOpenChange(false); }, onError: () => setPendingInput(null) },
    );
  }
  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-5"><DialogHeader><DialogTitle>Complete {reservation?.reference_number}?</DialogTitle><DialogDescription>This finalizes service and records the final amount as business data.</DialogDescription></DialogHeader>
    <div className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">Final reservation total</p><p className="font-heading text-2xl font-extrabold">{currency.format(reservation?.amounts.final ?? 0)}</p>{reservation?.amounts.refundable_credit ? <p className="mt-2 text-sm font-semibold">Refundable credit: {currency.format(reservation.amounts.refundable_credit)}</p> : null}</div>
    {requiresPayment ? <><SelectWithLabel id="reservation-payment-channel" label="How was the additional amount collected?" required value={paymentChannel} error={form.formState.errors.payment_channel?.message} options={[{ value: "CASH", label: "Cash" }, { value: "EWALLET", label: "E-wallet" }, { value: "BANK", label: "Bank" }]} placeholder="Select payment channel" onValueChange={(value) => {
      const nextChannel = value as CompleteReservationValues["payment_channel"];
      form.setValue("payment_channel", nextChannel, { shouldDirty: true, shouldValidate: true });
      if (nextChannel === "CASH") {
        form.setValue("payment_reference_number", "", { shouldDirty: true, shouldValidate: true });
        form.resetField("payment_proof", { defaultValue: undefined });
      }
    }} /><Field label="Transaction reference (optional)" error={form.formState.errors.payment_reference_number?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_reference_number)} disabled={paymentChannel !== "EWALLET" && paymentChannel !== "BANK"} {...form.register("payment_reference_number")} /></Field><Field label="Payment proof (optional)" error={form.formState.errors.payment_proof?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_proof)} disabled={paymentChannel !== "EWALLET" && paymentChannel !== "BANK"} {...form.register("payment_proof")} type="file" accept="image/jpeg,image/png,image/webp" /></Field></> : null}
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Not yet</Button>} /><Button type="submit" disabled={mutation.isPending || isMutationRateLimited(mutation)}>Review completion</Button></DialogFooter>
  </form></DialogContent></Dialog>
  <ReservationActionConfirmationDialog
    open={Boolean(pendingInput)}
    onOpenChange={(nextOpen) => { if (!nextOpen) setPendingInput(null); }}
    title={`Complete ${reservation?.reference_number}?`}
    description="This finalizes the reservation and cannot be reversed."
    confirmLabel={mutationButtonLabel("Completing…", "Complete reservation", mutation)}
    pending={mutation.isPending}
    disabled={isMutationRateLimited(mutation)}
    onConfirm={confirm}
  >
    <dl className="grid gap-2"><div className="flex justify-between gap-3"><dt>Final reservation total</dt><dd className="font-bold">{currency.format(reservation?.amounts.final ?? 0)}</dd></div>{requiresPayment ? <div className="flex justify-between gap-3"><dt>Settlement collected</dt><dd className="font-bold">{currency.format(reservation?.amounts.outstanding ?? 0)} · {pendingInput?.get("payment_channel")?.toString() ?? "Not specified"}</dd></div> : <div className="text-muted-foreground">No additional settlement is required.</div>}</dl>
  </ReservationActionConfirmationDialog></>;
}

export function CancelReservationDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useCancelReservation();
  const [pendingValues, setPendingValues] = useState<z.output<typeof cancelReservationSchema> | null>(null);
  const form = useForm<CancelReservationValues, unknown, z.output<typeof cancelReservationSchema>>({
    resolver: zodResolver(cancelReservationSchema),
    defaultValues: { reason: "", refund_type: "FULL", refund_amount: undefined },
  });
  const refundType = useWatch({ control: form.control, name: "refund_type" }) ?? "FULL";

  useEffect(() => {
    if (open) form.reset({ reason: "", refund_type: "FULL", refund_amount: undefined });
  }, [form, open, reservation?.id]);

  const submit = form.handleSubmit((values) => setPendingValues(values));
  function confirm() {
    if (!reservation || !pendingValues) return;
    mutation.mutate(
      { id: reservation.id, input: { reason: pendingValues.reason, refund_type: pendingValues.refund_type, ...(pendingValues.refund_type === "CUSTOM" ? { refund_amount: pendingValues.refund_amount } : {}) } },
      { onSuccess: () => { setPendingValues(null); onOpenChange(false); }, onError: () => setPendingValues(null) },
    );
  }
  const reasonError = form.formState.errors.reason?.message;
  const refundAmountError = form.formState.errors.refund_amount?.message;
  return <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader><DialogTitle>Cancel {reservation?.reference_number}?</DialogTitle><DialogDescription>Use this only for an approved force majeure cancellation. Court times will be released.</DialogDescription></DialogHeader>
          <Field label="Cancellation reason" htmlFor="reservation-cancellation-reason" required error={reasonError}><Textarea id="reservation-cancellation-reason" aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "reservation-cancellation-reason-error" : undefined} {...form.register("reason")} rows={5} /></Field>
          <SelectWithLabel id="reservation-refund" label="Refund" required value={refundType} error={form.formState.errors.refund_type?.message} options={[{ value: "FULL", label: `Full refund · ${currency.format(reservation?.amounts.paid ?? 0)}` }, { value: "CUSTOM", label: "Custom refund" }]} onValueChange={(value) => { if (value === "FULL" || value === "CUSTOM") form.setValue("refund_type", value, { shouldDirty: true, shouldValidate: true }); }} />
          {refundType === "CUSTOM" ? <Field label="Custom refund amount" htmlFor="reservation-custom-refund" required error={refundAmountError}><Input id="reservation-custom-refund" type="number" min="0" max={reservation?.amounts.paid} step="0.01" aria-invalid={Boolean(refundAmountError)} aria-describedby={refundAmountError ? "reservation-custom-refund-error" : undefined} {...form.register("refund_amount", { setValueAs: (value) => value === "" ? undefined : Number(value) })} /></Field> : null}
          <DialogFooter><DialogClose render={<Button type="button" variant="outline">Keep reservation</Button>} /><Button type="submit" variant="destructive" disabled={mutation.isPending || isMutationRateLimited(mutation)}>Review cancellation</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ReservationActionConfirmationDialog
      open={Boolean(pendingValues)}
      onOpenChange={(nextOpen) => { if (!nextOpen) setPendingValues(null); }}
      title={`Cancel ${reservation?.reference_number}?`}
      description="This cannot be reversed. The reservation will be finalized, refunded as shown, and its court times released."
      confirmLabel={mutationButtonLabel("Cancelling…", "Cancel reservation", mutation)}
      destructive
      pending={mutation.isPending}
      disabled={isMutationRateLimited(mutation)}
      onConfirm={confirm}
    >
      <dl className="grid gap-2"><div className="flex justify-between gap-3"><dt>Refund</dt><dd className="font-bold">{currency.format(pendingValues?.refund_type === "FULL" ? reservation?.amounts.paid ?? 0 : pendingValues?.refund_amount ?? 0)}</dd></div><div><dt className="text-muted-foreground">Reason</dt><dd className="whitespace-pre-wrap font-medium">{pendingValues?.reason}</dd></div></dl>
    </ReservationActionConfirmationDialog>
  </>;
}
