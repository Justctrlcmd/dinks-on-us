"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { FiImage, FiPlus, FiUsers } from "react-icons/fi";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaymentMethodQrDialog } from "@/components/common/payment-method-qr-dialog";
import { useCreateWalkInReservation } from "@/hooks/mutations/use-reservation-mutations";
import { useReservationOptions } from "@/hooks/queries/use-court-pricing";
import { usePublicPaymentMethods } from "@/hooks/queries/use-payment-methods";
import { formatDateOnly, todayInTimeZone } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import {
  expandReservationRanges,
  ReservationQuantityStepper,
  ReservationScheduleFields,
  type ReservationSlotSelection,
} from "@/forms/reservations/reservation-form-controls";
import {
  WALK_IN_RECEIPT_ACCEPT,
  walkInReservationSchema,
  type WalkInReservationValues,
} from "@/validation/custom/walk-in-reservation-schema";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
function SectionHeading({ id, title, description }: { id?: string; title: string; description: string }) {
  return <div><h2 id={id} className="font-heading text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

export function WalkInReservationForm() {
  const router = useRouter();
  const mutation = useCreateWalkInReservation();
  const paymentMethodsQuery = usePublicPaymentMethods();
  const [ranges, setRanges] = useState<ReservationSlotSelection[]>([{ courtId: "", slot: "" }]);
  const form = useForm<WalkInReservationValues>({
    resolver: zodResolver(walkInReservationSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_contact_number: "",
      date: todayInTimeZone(),
      slots: [],
      equipment: [],
      additional_players: 0,
      payment_channel: "CASH",
      payment_method_id: undefined,
      payment_reference_number: "",
      payment_proof: undefined,
    },
  });
  const date = useWatch({ control: form.control, name: "date" });
  const additionalPlayers = useWatch({ control: form.control, name: "additional_players" });
  const equipment = useWatch({ control: form.control, name: "equipment" });
  const paymentChannel = useWatch({ control: form.control, name: "payment_channel" });
  const paymentMethodId = useWatch({ control: form.control, name: "payment_method_id" });
  const optionsQuery = useReservationOptions(date);
  const options = optionsQuery.data;
  const paymentMethods = paymentMethodsQuery.data ?? [];
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === paymentMethodId) ?? null;
  const paymentSelection = paymentChannel === "CASH" ? "CASH" : paymentMethodId ? `METHOD:${paymentMethodId}` : null;
  const nonCashPayment = paymentChannel === "EWALLET_BANK";
  const selectedSlots = useMemo(() => expandReservationRanges(date, ranges), [date, ranges]);

  useEffect(() => {
    form.setValue("slots", selectedSlots, { shouldValidate: form.formState.isSubmitted });
  }, [form, selectedSlots]);

  const selectedSlotDetails = selectedSlots.map((slot) => {
    const period = options?.slots.find((candidate) => candidate.start_hour === slot.start_hour);
    const court = options?.courts.find((candidate) => candidate.id === slot.court_id);
    return {
      ...slot,
      courtName: court?.name ?? `Court ${slot.court_id}`,
      endHour: period?.end_hour ?? slot.start_hour + 1,
      amount: Number(period?.price ?? 0),
    };
  });
  const selectedEquipment = (options?.equipment ?? []).filter((item) => equipment.some((selected) => selected.id === item.id && selected.quantity > 0));
  const slotAmount = selectedSlotDetails.reduce((total, slot) => total + slot.amount, 0);
  const playerUnitAmount = options?.configuration?.additional_player_price ?? 0;
  const playerAmount = additionalPlayers * playerUnitAmount;
  const equipmentAmount = selectedEquipment.reduce((total, item) => total + quantityFor(item.id) * item.price, 0);
  const total = slotAmount + playerAmount + equipmentAmount;
  const slotError = typeof form.formState.errors.slots?.message === "string" ? form.formState.errors.slots.message : undefined;

  function quantityFor(id: number): number {
    return equipment.find((item) => item.id === id)?.quantity ?? 0;
  }

  function setEquipmentQuantity(id: number, quantity: number) {
    const next = quantity > 0
      ? [...equipment.filter((item) => item.id !== id), { id, quantity }]
      : equipment.filter((item) => item.id !== id);
    form.setValue("equipment", next, { shouldValidate: true, shouldDirty: true });
  }

  const submit = form.handleSubmit(async (values) => {
    if (selectedSlots.length !== ranges.length) {
      form.setError("slots", { message: "Complete or remove every court and time slot row." });
      return;
    }
    try {
      await mutation.mutateAsync({
        customer_name: values.customer_name.trim(),
        customer_email: values.customer_email.trim().toLowerCase(),
        customer_contact_number: values.customer_contact_number.trim(),
        slots: values.slots,
        equipment: values.equipment,
        additional_players: values.additional_players,
        payment_channel: values.payment_channel,
        payment_method_id: values.payment_method_id,
        payment_reference_number: values.payment_reference_number?.trim() || undefined,
        payment_proof: values.payment_proof?.item(0) ?? undefined,
      });
      router.push("/portal/reservations");
    } catch {}
  });

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      <Card className="gap-4 p-4 sm:p-5">
        <SectionHeading title="Court schedule" description="Choose one date and add every available court time included in this walk-in." />
        <ReservationScheduleFields
          date={date}
          setDate={(nextDate) => form.setValue("date", nextDate, { shouldValidate: true, shouldDirty: true })}
          ranges={ranges}
          setRanges={setRanges}
          onRemoveRange={(index) => setRanges((current) => current.filter((_, rangeIndex) => rangeIndex !== index))}
          error={slotError}
        />
        <Button type="button" variant="link" size="sm" className="h-auto w-fit px-0" onClick={() => setRanges((current) => [...current, { courtId: "", slot: "" }])}>
          <FiPlus aria-hidden="true" /> Add another time slot
        </Button>
      </Card>

      <Card className="gap-4 p-4 sm:p-5">
        <SectionHeading title="Players and rental equipment" description="Additional players are charged beyond the configured players included per court." />
        <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><FiUsers aria-hidden="true" /> Additional players</h3>
            <p className="mt-1 text-sm text-muted-foreground">{currency.format(playerUnitAmount)} each</p>
          </div>
          <ReservationQuantityStepper
            value={additionalPlayers}
            decreaseDisabled={additionalPlayers === 0}
            increaseDisabled={additionalPlayers >= 1000}
            decreaseLabel="Remove one additional player"
            increaseLabel="Add one additional player"
            onDecrease={() => form.setValue("additional_players", Math.max(0, additionalPlayers - 1), { shouldDirty: true })}
            onIncrease={() => form.setValue("additional_players", additionalPlayers + 1, { shouldDirty: true })}
          />
        </div>
        <section className="rounded-xl border p-4" aria-labelledby="walk-in-equipment-title">
          <h3 id="walk-in-equipment-title" className="font-semibold">Rental equipment</h3>
          {optionsQuery.isPending ? <p className="mt-3 text-sm text-muted-foreground">Loading rental equipment…</p> : optionsQuery.isError ? <p className="mt-3 text-sm text-destructive">Rental equipment could not be loaded.</p> : options?.equipment.length ? (
            <div className="mt-3 grid gap-3">
              {options.equipment.map((item) => {
                const quantity = quantityFor(item.id);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0">
                    <div className="min-w-0"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{currency.format(item.price)} · up to {item.available_quantity}</p></div>
                    <ReservationQuantityStepper
                      value={quantity}
                      decreaseDisabled={quantity === 0}
                      increaseDisabled={quantity >= item.available_quantity}
                      decreaseLabel={`Remove one ${item.name}`}
                      increaseLabel={`Add one ${item.name}`}
                      onDecrease={() => setEquipmentQuantity(item.id, quantity - 1)}
                      onIncrease={() => setEquipmentQuantity(item.id, quantity + 1)}
                    />
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">No rental equipment is currently active.</p>}
        </section>
      </Card>

      {selectedSlotDetails.length > 0 ? (
        <Card className="gap-4 border-primary/35 p-4 sm:p-5" aria-labelledby="walk-in-summary-title">
          <SectionHeading id="walk-in-summary-title" title="Summary breakdown" description="The backend rechecks availability and calculates the authoritative amount when submitted." />
          <div className="grid gap-2 text-sm">
            {selectedSlotDetails.map((slot) => (
              <div key={`${slot.court_id}-${slot.start_hour}`} className="flex flex-wrap justify-between gap-2 border-b py-2">
                <span>{slot.courtName} · {formatDateOnly(slot.date)} · {formatHourRange(slot.start_hour, slot.endHour)}</span>
                <strong>{currency.format(slot.amount)}</strong>
              </div>
            ))}
            {additionalPlayers > 0 ? <div className="flex justify-between gap-3"><span>Additional players · {additionalPlayers} × {currency.format(playerUnitAmount)}</span><strong>{currency.format(playerAmount)}</strong></div> : null}
            {selectedEquipment.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.name} · {quantityFor(item.id)} × {currency.format(item.price)}</span><strong>{currency.format(quantityFor(item.id) * item.price)}</strong></div>)}
            <div className="mt-2 flex items-end justify-between gap-4 border-t pt-4"><span className="font-heading text-base font-bold">Total</span><strong className="font-heading text-2xl font-extrabold text-primary">{currency.format(total)}</strong></div>
          </div>
        </Card>
      ) : null}

      <Card className="gap-4 p-4 sm:p-5">
        <SectionHeading title="Customer information" description="Record the same customer details used for online reservations." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><InputWithLabel label="Name" autoComplete="name" required {...form.register("customer_name")} error={form.formState.errors.customer_name?.message} /></div>
          <InputWithLabel label="Email" type="email" autoComplete="email" required {...form.register("customer_email")} error={form.formState.errors.customer_email?.message} />
          <InputWithLabel label="Contact number" type="tel" inputMode="numeric" maxLength={11} pattern="09[0-9]{9}" autoComplete="tel" required onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 11); }} placeholder="09XXXXXXXXX" {...form.register("customer_contact_number")} error={form.formState.errors.customer_contact_number?.message} />
        </div>
      </Card>

      <Card className="gap-4 p-4 sm:p-5">
        <SectionHeading title="Payment" description="The payment is recorded as verified when this walk-in is submitted." />
        <SelectWithLabel
          id="walk-in-payment-method"
          label="Payment method"
          required
          value={paymentSelection}
          options={[
            { value: "CASH", label: "Cash" },
            ...paymentMethods.map((method) => ({ value: `METHOD:${method.id}`, label: method.name })),
          ]}
          onValueChange={(value) => {
            if (!value) return;
            if (value === "CASH") {
              form.setValue("payment_channel", "CASH", { shouldValidate: true, shouldDirty: true });
              form.setValue("payment_method_id", undefined, { shouldValidate: true, shouldDirty: true });
              return;
            }
            const id = Number(value.replace("METHOD:", ""));
            form.setValue("payment_channel", "EWALLET_BANK", { shouldValidate: true, shouldDirty: true });
            form.setValue("payment_method_id", id, { shouldValidate: true, shouldDirty: true });
          }}
          description={paymentMethodsQuery.isPending ? "Loading active e-wallet and bank methods…" : "Cash or an active payment account from the public checkout."}
          error={form.formState.errors.payment_method_id?.message ?? form.formState.errors.payment_channel?.message}
        />
        {paymentMethodsQuery.isError ? <p role="alert" className="text-sm text-destructive">Active e-wallet and bank methods could not be loaded. Cash remains available.</p> : null}
        {selectedPaymentMethod ? <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm"><dl className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Account name</dt><dd className="font-medium">{selectedPaymentMethod.account_name}</dd></div><div><dt className="text-muted-foreground">Account number</dt><dd className="font-medium">{selectedPaymentMethod.account_number}</dd></div></dl><PaymentMethodQrDialog method={selectedPaymentMethod} /></div> : null}
        <InputWithLabel label={nonCashPayment ? "Transaction reference" : "Transaction reference (optional)"} required={nonCashPayment} {...form.register("payment_reference_number")} error={form.formState.errors.payment_reference_number?.message} />
        <FormFieldWrapper id="walk-in-payment-proof" label={nonCashPayment ? "Receipt image" : "Receipt image (optional)"} required={nonCashPayment} description="JPG, PNG, or WebP; maximum 5 MB." error={form.formState.errors.payment_proof?.message}>
          <div className="relative">
            <FiImage className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="walk-in-payment-proof" type="file" accept={WALK_IN_RECEIPT_ACCEPT} required={nonCashPayment} className="cursor-pointer pl-9 file:mr-3" aria-invalid={Boolean(form.formState.errors.payment_proof)} aria-describedby={["walk-in-payment-proof-description", form.formState.errors.payment_proof && "walk-in-payment-proof-error"].filter(Boolean).join(" ")} {...form.register("payment_proof")} />
          </div>
        </FormFieldWrapper>
      </Card>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="font-semibold">Create as verified Walk-in</p><p className="text-sm text-muted-foreground">Selected court times become unavailable online immediately.</p></div>
        <Button type="submit" disabled={mutation.isPending || optionsQuery.isPending} className="sm:min-w-44">
          {mutation.isPending ? "Submitting walk-in…" : "Submit walk-in"}
        </Button>
      </Card>
    </form>
  );
}
