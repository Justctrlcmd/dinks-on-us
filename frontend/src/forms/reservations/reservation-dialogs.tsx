"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
import { useAddReservationAddOns, useCancelReservation, useCompleteReservation, useRejectReservation, useRescheduleReservation } from "@/hooks/mutations/use-reservation-mutations";
import { formatDateOnly } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import { reservationProofUrl } from "@/services/reservations/reservation-service";
import type { ManagementReservation, ReservationAddOnsInput, ReservationPaymentChannel } from "@/types/reservation";
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
  SETTLEMENT: {
    label: "Final balance payment",
    description: "Remaining balance collected when the reservation was completed.",
  },
};

function Field({ label, htmlFor, required, error, children }: { label: string; htmlFor?: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label htmlFor={htmlFor}>{label}{required ? <span aria-hidden="true"> *</span> : null}</Label>{children}{error ? <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs leading-4 text-destructive">{error}</p> : null}</div>;
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
      <section className="rounded-xl border p-4"><h3 className="font-heading font-bold">Original reservation summary</h3><div className="mt-3 grid gap-2">{originalSlots.map((slot) => <div key={slot.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm last:border-0"><span>{slot.court_name} · {formatDateOnly(slot.date)} · {formatHourRange(slot.start_hour, slot.end_hour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}</div>
        {item.additional_players.original_quantity > 0 ? <p className="mt-2 flex justify-between gap-3 text-sm"><span>Additional players: {item.additional_players.original_quantity} × {currency.format(item.additional_players.unit_amount)}</span><strong>{currency.format(item.additional_players.original_quantity * item.additional_players.unit_amount)}</strong></p> : null}
        {originalEquipment.map((equipment) => <p key={equipment.id} className="mt-2 flex justify-between gap-3 text-sm"><span>{equipment.name}: {equipment.quantity} × {currency.format(equipment.unit_amount)}</span><strong>{currency.format(equipment.total_amount)}</strong></p>)}
        <dl className="mt-4 grid gap-2 border-t pt-3 text-sm"><div><dt className="text-muted-foreground">Original reservation total</dt><dd className="font-heading text-lg font-extrabold">{currency.format(item.amounts.original)}</dd></div></dl>
      </section>
      {hasAddOns ? <>
      <section className="rounded-xl border p-4"><h3 className="font-heading font-bold">Paid add-ons</h3><div className="mt-3 grid gap-2">
        {addOnSlots.map((slot) => <div key={slot.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm last:border-0"><span>{slot.court_name} · {formatDateOnly(slot.date)} · {formatHourRange(slot.start_hour, slot.end_hour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}
        {addOnPlayers.map((adjustment) => <div key={adjustment.id} className="flex justify-between gap-3 text-sm"><span>{adjustment.description}: {adjustment.quantity} × {currency.format(adjustment.unit_amount)}</span><strong>{currency.format(adjustment.total_amount)}</strong></div>)}
        {addOnEquipment.map((equipment) => <div key={equipment.id} className="flex justify-between gap-3 text-sm"><span>{equipment.name}: {equipment.quantity} × {currency.format(equipment.unit_amount)}</span><strong>{currency.format(equipment.total_amount)}</strong></div>)}
        <div className="mt-2 grid gap-2 border-t pt-3 text-sm"><div className="flex justify-between gap-3"><span>Total add-ons</span><strong>{currency.format(addOnTotal)}</strong></div><div className="flex justify-between gap-3 text-primary"><span>Add-on payment recorded</span><strong>{currency.format(addOnPaid)}</strong></div></div>
      </div></section>
      <section className="rounded-xl border p-4"><h3 className="font-heading font-bold">Updated total</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Original reservation</dt><dd className="font-bold">{currency.format(item.amounts.original)}</dd></div><div><dt className="text-muted-foreground">Add-ons</dt><dd className="font-bold">{currency.format(addOnTotal)}</dd></div>{Math.abs(otherAdjustments) >= 0.01 ? <div><dt className="text-muted-foreground">Other adjustments</dt><dd className={`font-bold ${otherAdjustments < 0 ? "text-primary" : ""}`}>{currency.format(otherAdjustments)}</dd></div> : null}<div><dt className="text-muted-foreground">Total paid</dt><dd className="font-bold">{currency.format(item.amounts.paid)}</dd></div></dl><div className="mt-4 border-t pt-3"><div className="flex justify-between gap-3"><span className="font-semibold">Updated reservation total</span><strong className="font-heading text-xl font-extrabold text-primary">{currency.format(item.amounts.final)}</strong></div>{item.amounts.outstanding > 0 ? <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">Outstanding balance: {currency.format(item.amounts.outstanding)}</p> : null}{item.amounts.refundable_credit > 0 ? <p className="mt-3 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary">Refundable credit: {currency.format(item.amounts.refundable_credit)}</p> : null}</div></section>
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-heading font-bold text-primary">{copy.label}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">{copy.description}</p>
                </div>
                <p className="font-heading font-bold">{currency.format(payment.amount)}</p>
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
  const form = useForm<RejectReservationValues>({
    resolver: zodResolver(rejectReservationSchema),
    defaultValues: { concern: concernOptions[0][0], reason: "" },
  });
  const concern = useWatch({ control: form.control, name: "concern" });

  useEffect(() => {
    if (open) form.reset({ concern: concernOptions[0][0], reason: "" });
  }, [form, open, reservation?.id]);

  const submit = form.handleSubmit((values) => {
    if (!reservation) return;
    mutation.mutate({ id: reservation.id, concern: values.concern, reason: values.reason }, { onSuccess: () => onOpenChange(false) });
  });
  const reasonError = form.formState.errors.reason?.message;

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-5"><DialogHeader><DialogTitle>Reject {reservation?.reference_number}?</DialogTitle><DialogDescription>This finalizes the reservation and immediately releases its court times.</DialogDescription></DialogHeader>
    <SelectWithLabel id="reservation-concern" label="Concern" required value={concern} error={form.formState.errors.concern?.message} options={concernOptions.map(([value, label]) => ({ value, label }))} onValueChange={(value) => { if (value) form.setValue("concern", value as RejectReservationValues["concern"], { shouldDirty: true, shouldValidate: true }); }} />
    <Field label="Reason" htmlFor="reservation-rejection-reason" required error={reasonError}><Textarea id="reservation-rejection-reason" aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "reservation-rejection-reason-error" : undefined} {...form.register("reason")} maxLength={1500} rows={5} placeholder="Explain why this reservation cannot be accepted." /></Field>
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Keep reservation</Button>} /><Button type="submit" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? "Rejecting…" : "Yes, reject reservation"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function RescheduleForm({ reservation, onDone }: { reservation: ManagementReservation; onDone: () => void }) {
  const requiredCount = reservation.slots?.length ?? 0;
  const initialRanges = Array.from({ length: requiredCount }, () => ({ courtId: "", slot: "" }));
  const mutation = useRescheduleReservation();
  const form = useForm<RescheduleReservationValues>({
    resolver: zodResolver(rescheduleReservationSchema(requiredCount)),
    defaultValues: { date: reservation.booking_date, ranges: initialRanges },
  });
  const date = useWatch({ control: form.control, name: "date" }) ?? reservation.booking_date;
  const ranges = useWatch({ control: form.control, name: "ranges" }) ?? initialRanges;
  const slotCount = expandRanges(date, ranges).length;
  const submit = form.handleSubmit((values) => {
    mutation.mutate({ id: reservation.id, slots: expandRanges(values.date, values.ranges) }, { onSuccess: onDone });
  });
  const scheduleError = form.formState.errors.date?.message ?? form.formState.errors.ranges?.message;
  return <form onSubmit={submit} noValidate className="grid gap-5"><DialogHeader><DialogTitle>Reschedule {reservation.reference_number}?</DialogTitle><DialogDescription>Choose exactly {requiredCount} one-hour slots. Higher rates create a balance; lower rates create refundable credit.</DialogDescription></DialogHeader>
    <ScheduleFields date={date} setDate={(nextDate) => form.setValue("date", nextDate, { shouldDirty: true, shouldValidate: true })} ranges={ranges} setRanges={(nextRanges) => form.setValue("ranges", nextRanges, { shouldDirty: true, shouldValidate: true })} allowedCurrentSlots={reservation.slots ?? []} error={scheduleError} />
    <p className={slotCount === requiredCount ? "text-sm font-semibold text-primary" : "text-sm font-semibold text-destructive"}>{slotCount} of {requiredCount} required slots selected</p>
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Keep current schedule</Button>} /><Button type="submit" disabled={mutation.isPending || slotCount !== requiredCount}>{mutation.isPending ? "Rescheduling…" : "Yes, reschedule"}</Button></DialogFooter>
  </form>;
}

export function RescheduleReservationDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">{open && reservation ? <RescheduleForm key={`${reservation.id}-${reservation.reschedule_count}`} reservation={reservation} onDone={() => onOpenChange(false)} /> : null}</DialogContent></Dialog>;
}

export function AddOnsDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const date = reservation?.booking_date ?? "";
  const options = useReservationOptions(date).data;
  const [courtOpen, setCourtOpen] = useState(false);
  const mutation = useAddReservationAddOns();
  const form = useForm<ReservationAddOnsValues>({
    resolver: zodResolver(reservationAddOnsSchema),
    defaultValues: { ranges: [{ courtId: "", slot: "" }], additional_players: 0, equipment: {}, payment_channel: null, payment_reference_number: "", payment_proof: undefined },
  });
  const players = useWatch({ control: form.control, name: "additional_players" }) ?? 0;
  const equipment = useWatch({ control: form.control, name: "equipment" }) ?? {};
  const ranges = useWatch({ control: form.control, name: "ranges" }) ?? [{ courtId: "", slot: "" }];
  const paymentChannel = useWatch({ control: form.control, name: "payment_channel" }) ?? null;
  useEffect(() => {
    if (open) {
      form.reset({ ranges: [{ courtId: "", slot: "" }], additional_players: 0, equipment: {}, payment_channel: null, payment_reference_number: "", payment_proof: undefined });
    }
  }, [form, open, reservation?.id]);
  const selectedSlots = expandRanges(date, ranges);
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
  const currentTotal = reservation?.amounts.final ?? 0;
  const currentBalance = Math.max(reservation?.amounts.outstanding ?? 0, 0);
  const currentCredit = Math.max(reservation?.amounts.refundable_credit ?? 0, 0);
  const updatedTotal = currentTotal + addOnAmount;
  const amountToPay = Math.max(0, addOnAmount + currentBalance - currentCredit);
  const hasInput = selectedSlots.length > 0 || players > 0 || selectedEquipment.length > 0;
  const submit = form.handleSubmit((values) => {
    if (!reservation || !values.payment_channel) return;
    const selectedSlots = expandRanges(date, values.ranges);
    const selectedEquipment = (options?.equipment ?? []).filter((item) => (values.equipment[item.id] ?? 0) > 0);
    const proof = values.payment_proof?.item(0);
    const input: ReservationAddOnsInput = {
      slots: selectedSlots,
      additional_players: values.additional_players,
      equipment: selectedEquipment.map((item) => ({ id: item.id, quantity: values.equipment[item.id] ?? 0 })),
      payment_channel: values.payment_channel,
      payment_reference_number: values.payment_reference_number?.trim() || undefined,
      payment_proof: proof && proof.size > 0 ? proof : undefined,
    };
    mutation.mutate({ id: reservation.id, input }, { onSuccess: () => onOpenChange(false) });
  });
  const scheduleError = form.formState.errors.ranges?.message ?? (form.formState.errors.ranges ? "Complete each selected court time." : undefined);
  const paymentChannelError = form.formState.errors.payment_channel?.message;
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) setCourtOpen(false); onOpenChange(nextOpen); }}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl"><form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-4"><DialogHeader><DialogTitle>Add these items to {reservation?.reference_number}?</DialogTitle><DialogDescription>Add available court time, players, or rental equipment to this ongoing reservation.</DialogDescription></DialogHeader>
    <section className="rounded-xl border"><button type="button" className="flex min-h-12 w-full items-center justify-between px-4 font-semibold" onClick={() => setCourtOpen(!courtOpen)}>Add court time?<FiChevronDown className={courtOpen ? "rotate-180" : ""} aria-hidden /></button>{courtOpen ? <div className="border-t p-4"><ScheduleFields date={date} setDate={() => undefined} dateLocked ranges={ranges} setRanges={(nextRanges) => form.setValue("ranges", nextRanges, { shouldDirty: true, shouldValidate: true })} onRemoveRange={(index) => form.setValue("ranges", ranges.filter((_, rangeIndex) => rangeIndex !== index), { shouldDirty: true, shouldValidate: true })} error={scheduleError} /><Button type="button" variant="link" size="sm" className="mt-3 h-auto px-0" onClick={() => form.setValue("ranges", [...ranges, { courtId: "", slot: "" }], { shouldDirty: true, shouldValidate: true })}><FiPlus aria-hidden="true" />Add another time slot</Button></div> : null}</section>
    <section className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><h3 className="font-semibold">Add players</h3><p className="text-sm text-muted-foreground">{currency.format(options?.configuration?.additional_player_price ?? 0)} each</p></div><QuantityStepper value={players} decreaseDisabled={players === 0} increaseDisabled={false} decreaseLabel="Remove one additional player" increaseLabel="Add one additional player" onDecrease={() => form.setValue("additional_players", Math.max(0, players - 1), { shouldDirty: true, shouldValidate: true })} onIncrease={() => form.setValue("additional_players", players + 1, { shouldDirty: true, shouldValidate: true })} /></section>
    <section className="rounded-xl border p-4"><h3 className="font-semibold">Rental equipment</h3><div className="mt-3 grid gap-3">{options?.equipment.map((item) => { const quantity = equipment[item.id] ?? 0; return <div key={item.id} className="flex items-center justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0"><div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{currency.format(item.price)} · {item.available_quantity} available</p></div><QuantityStepper value={quantity} decreaseDisabled={quantity === 0} increaseDisabled={quantity >= item.available_quantity} decreaseLabel={`Remove one ${item.name}`} increaseLabel={`Add one ${item.name}`} onDecrease={() => form.setValue("equipment", { ...equipment, [item.id]: Math.max(0, quantity - 1) }, { shouldDirty: true, shouldValidate: true })} onIncrease={() => form.setValue("equipment", { ...equipment, [item.id]: quantity + 1 }, { shouldDirty: true, shouldValidate: true })} /></div>; })}</div></section>
    {hasInput ? <>
      <section className="rounded-xl border p-4">
        <h3 className="font-semibold">Add-on breakdown</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {selectedSlotDetails.map((slot) => <div key={slot.court_id + "-" + slot.start_hour} className="flex justify-between gap-3"><span>{slot.courtName} · {formatDateOnly(slot.date)} · {formatHourRange(slot.start_hour, slot.endHour)}</span><strong>{currency.format(slot.amount)}</strong></div>)}
          {players > 0 ? <div className="flex justify-between gap-3"><span>Additional players · {players} × {currency.format(options?.configuration?.additional_player_price ?? 0)}</span><strong>{currency.format(playerAmount)}</strong></div> : null}
          {selectedEquipment.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.name} · {equipment[item.id] ?? 0} × {currency.format(item.price)}</span><strong>{currency.format((equipment[item.id] ?? 0) * item.price)}</strong></div>)}
          {currentBalance > 0 ? <div className="flex justify-between gap-3 text-muted-foreground"><span>Previous outstanding balance</span><strong>{currency.format(currentBalance)}</strong></div> : null}
          {currentCredit > 0 ? <div className="flex justify-between gap-3 text-primary"><span>Existing credit applied</span><strong>−{currency.format(currentCredit)}</strong></div> : null}
          <div className="mt-2 grid gap-2 border-t pt-3"><div className="flex justify-between gap-3"><span>Updated reservation total</span><strong>{currency.format(updatedTotal)}</strong></div><div className="flex justify-between gap-3 text-base font-extrabold text-primary"><span>Amount to pay now</span><strong>{currency.format(amountToPay)}</strong></div></div>
        </div>
      </section>
      <section className="grid gap-4 rounded-xl border p-4">
        <div><h3 className="font-semibold">Payment method</h3><p className="text-sm text-muted-foreground">Record how the add-on amount was collected.</p></div>
        <SelectWithLabel id="reservation-addon-payment-channel" label="Payment method" required value={paymentChannel} error={paymentChannelError} options={[{ value: "CASH", label: "Cash" }, { value: "EWALLET", label: "E-wallet" }, { value: "BANK", label: "Bank" }]} placeholder="Select payment method" onValueChange={(value) => form.setValue("payment_channel", value as ReservationPaymentChannel | null, { shouldDirty: true, shouldValidate: true })} />
        <Field label="Transaction reference (optional)" error={form.formState.errors.payment_reference_number?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_reference_number)} {...form.register("payment_reference_number")} /></Field>
        <Field label="Payment receipt (optional)" error={form.formState.errors.payment_proof?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_proof)} {...form.register("payment_proof")} type="file" accept="image/jpeg,image/png,image/webp" /></Field>
      </section>
    </> : null}
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Cancel</Button>} /><Button type="submit" disabled={!hasInput || !paymentChannel || mutation.isPending}>{mutation.isPending ? "Adding…" : "Add and record payment"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

export function CompleteReservationDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useCompleteReservation();
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
    mutation.mutate({ id: reservation.id, input }, { onSuccess: () => onOpenChange(false) });
  });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-5"><DialogHeader><DialogTitle>Complete {reservation?.reference_number}?</DialogTitle><DialogDescription>This finalizes service and records the final amount as business data.</DialogDescription></DialogHeader>
    <div className="rounded-xl border p-4"><p className="text-sm text-muted-foreground">Final reservation total</p><p className="font-heading text-2xl font-extrabold">{currency.format(reservation?.amounts.final ?? 0)}</p>{reservation?.amounts.refundable_credit ? <p className="mt-2 text-sm font-semibold">Refundable credit: {currency.format(reservation.amounts.refundable_credit)}</p> : null}</div>
    {requiresPayment ? <><SelectWithLabel id="reservation-payment-channel" label="How was the additional amount collected?" required value={paymentChannel} error={form.formState.errors.payment_channel?.message} options={[{ value: "CASH", label: "Cash" }, { value: "EWALLET", label: "E-wallet" }, { value: "BANK", label: "Bank" }]} placeholder="Select payment channel" onValueChange={(value) => form.setValue("payment_channel", value as CompleteReservationValues["payment_channel"], { shouldDirty: true, shouldValidate: true })} /><Field label="Transaction reference (optional)" error={form.formState.errors.payment_reference_number?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_reference_number)} {...form.register("payment_reference_number")} /></Field><Field label="Payment proof (optional)" error={form.formState.errors.payment_proof?.message}><Input aria-invalid={Boolean(form.formState.errors.payment_proof)} {...form.register("payment_proof")} type="file" accept="image/jpeg,image/png,image/webp" /></Field></> : null}
    <DialogFooter><DialogClose render={<Button type="button" variant="outline">Not yet</Button>} /><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Completing…" : "Yes, complete reservation"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

export function CancelReservationDialog({ reservation, open, onOpenChange }: { reservation: ManagementReservation | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useCancelReservation();
  const form = useForm<CancelReservationValues, unknown, z.output<typeof cancelReservationSchema>>({
    resolver: zodResolver(cancelReservationSchema),
    defaultValues: { reason: "", refund_type: "FULL", refund_amount: undefined },
  });
  const refundType = useWatch({ control: form.control, name: "refund_type" }) ?? "FULL";

  useEffect(() => {
    if (open) form.reset({ reason: "", refund_type: "FULL", refund_amount: undefined });
  }, [form, open, reservation?.id]);

  const submit = form.handleSubmit((values) => {
    if (!reservation) return;
    mutation.mutate({ id: reservation.id, input: { reason: values.reason, refund_type: values.refund_type, ...(values.refund_type === "CUSTOM" ? { refund_amount: values.refund_amount } : {}) } }, { onSuccess: () => onOpenChange(false) });
  });
  const reasonError = form.formState.errors.reason?.message;
  const refundAmountError = form.formState.errors.refund_amount?.message;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg"><form key={`${reservation?.id ?? "none"}-${open}`} onSubmit={submit} noValidate className="grid gap-5"><DialogHeader><DialogTitle>Cancel {reservation?.reference_number}?</DialogTitle><DialogDescription>Use this only for an approved force majeure cancellation. Court times will be released.</DialogDescription></DialogHeader><Field label="Cancellation reason" htmlFor="reservation-cancellation-reason" required error={reasonError}><Textarea id="reservation-cancellation-reason" aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? "reservation-cancellation-reason-error" : undefined} {...form.register("reason")} rows={5} /></Field><SelectWithLabel id="reservation-refund" label="Refund" required value={refundType} error={form.formState.errors.refund_type?.message} options={[{ value: "FULL", label: `Full refund · ${currency.format(reservation?.amounts.paid ?? 0)}` }, { value: "CUSTOM", label: "Custom refund" }]} onValueChange={(value) => { if (value === "FULL" || value === "CUSTOM") form.setValue("refund_type", value, { shouldDirty: true, shouldValidate: true }); }} />{refundType === "CUSTOM" ? <Field label="Custom refund amount" htmlFor="reservation-custom-refund" required error={refundAmountError}><Input id="reservation-custom-refund" type="number" min="0" max={reservation?.amounts.paid} step="0.01" aria-invalid={Boolean(refundAmountError)} aria-describedby={refundAmountError ? "reservation-custom-refund-error" : undefined} {...form.register("refund_amount", { setValueAs: (value) => value === "" ? undefined : Number(value) })} /></Field> : null}<DialogFooter><DialogClose render={<Button type="button" variant="outline">Keep reservation</Button>} /><Button type="submit" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? "Cancelling…" : "Yes, cancel and record refund"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
