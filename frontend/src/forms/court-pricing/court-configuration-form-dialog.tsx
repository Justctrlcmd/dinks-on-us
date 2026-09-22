"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { FiSettings } from "react-icons/fi";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateCourtConfiguration } from "@/hooks/mutations/use-court-pricing-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import { formatHour } from "@/lib/time";
import { addTimeRange, canAddTimeRange, changeTimeRangeEnd, removeLastTimeRange } from "@/lib/time-ranges";
import type { CourtConfiguration } from "@/types/court-pricing";
import {
  courtConfigurationSchema,
  type CourtConfigurationValues,
} from "@/validation/custom/court-pricing-schema";

const allHours = Array.from({ length: 24 }, (_, hour) => hour);
const advanceBookingDayOptions = Array.from({ length: 365 }, (_, index) => {
  const days = index + 1;
  return { value: String(days), label: `${days} ${days === 1 ? "day" : "days"}` };
});

function initialValues(configuration: CourtConfiguration | null): CourtConfigurationValues {
  return configuration ?? {
    opening_hour: 7,
    closing_hour: 24,
    included_players_per_court: 4,
    additional_player_price: 100,
    advance_booking_days: 30,
    weekday_rates: [],
    weekend_rates: [],
  };
}

function TimeSelect({
  id,
  label,
  value,
  options,
  disabled,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  options: number[];
  disabled?: boolean;
  error?: string;
  onChange: (hour: number) => void;
}) {
  return (
    <SelectWithLabel
      id={id}
      label={label}
      value={String(value)}
      options={options.map((hour) => ({ value: String(hour), label: formatHour(hour) }))}
      disabled={disabled}
      error={error}
      onValueChange={(next) => { if (next) onChange(Number(next)); }}
    />
  );
}

function RateEditor({
  form,
  field,
  title,
  description,
}: {
  form: UseFormReturn<CourtConfigurationValues>;
  field: "weekday_rates" | "weekend_rates";
  title: string;
  description: string;
}) {
  const periods = useWatch({ control: form.control, name: field });
  const openingHour = useWatch({ control: form.control, name: "opening_hour" });
  const closingHour = useWatch({ control: form.control, name: "closing_hour" });
  const groupError = form.formState.errors[field]?.root?.message ?? form.formState.errors[field]?.message;

  function changeEnd(index: number, endHour: number) {
    form.setValue(field, changeTimeRangeEnd(periods, index, endHour), { shouldDirty: true, shouldValidate: true });
  }

  function addPeriod() {
    const last = periods.at(-1);
    if (!last) {
      form.setValue(field, [{ start_hour: openingHour, end_hour: closingHour, price: 0 }], { shouldDirty: true, shouldValidate: true });
      return;
    }
    form.setValue(field, addTimeRange(periods, closingHour, (start_hour, end_hour, previous) => ({ start_hour, end_hour, price: previous.price })), { shouldDirty: true, shouldValidate: true });
  }

  function removeLastPeriod() {
    form.setValue(field, removeLastTimeRange(periods, closingHour), { shouldDirty: true, shouldValidate: true });
  }

  const canAdd = periods.length === 0 || canAddTimeRange(periods, closingHour);

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-background p-4" aria-labelledby={`${field}-title`}>
      <div>
        <h3 id={`${field}-title`} className="font-heading text-base font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-3">
        {periods.map((period, index) => {
          const periodError = form.formState.errors[field]?.[index];
          const toOptions = Array.from(
            { length: Math.max(0, closingHour - period.start_hour) },
            (_, optionIndex) => period.start_hour + optionIndex + 1,
          );

          return (
            <div key={`${field}-${index}`} className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_1fr]">
              <TimeSelect id={`${field}-${index}-from`} label="From" value={period.start_hour} options={[period.start_hour]} disabled onChange={() => undefined} error={periodError?.start_hour?.message} />
              <TimeSelect id={`${field}-${index}-to`} label="To" value={period.end_hour} options={toOptions} onChange={(hour) => changeEnd(index, hour)} error={periodError?.end_hour?.message} />
              <InputWithLabel
                id={`${field}-${index}-price`}
                label="Price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                {...form.register(`${field}.${index}.price`, { valueAsNumber: true })}
                error={periodError?.price?.message}
              />
            </div>
          );
        })}
      </div>

      {groupError ? <p role="alert" className="text-xs leading-4 text-destructive">{groupError}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="link" className="h-auto p-0" disabled={!canAdd} onClick={addPeriod}>
          <FiSettings aria-hidden="true" />
          Custom price across different times
        </Button>
        {periods.length > 1 ? <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={removeLastPeriod}>Remove last time range</Button> : null}
      </div>
      {!canAdd && periods.length === 1 ? <p className="text-xs text-muted-foreground">Choose an earlier “To” time above to create another price period.</p> : null}
    </section>
  );
}

export function CourtConfigurationFormDialog({
  configuration,
  open,
  onOpenChange,
}: {
  configuration: CourtConfiguration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useUpdateCourtConfiguration();
  const form = useForm<CourtConfigurationValues>({
    resolver: zodResolver(courtConfigurationSchema),
    defaultValues: initialValues(configuration),
  });

  function changeHours(openingHour: number, closingHour: number) {
    form.setValue("opening_hour", openingHour, { shouldDirty: true });
    form.setValue("closing_hour", closingHour, { shouldDirty: true });
    for (const field of ["weekday_rates", "weekend_rates"] as const) {
      const currentPeriods = form.getValues(field);
      const nextPeriods = currentPeriods.length === 0 ? [] : [{ start_hour: openingHour, end_hour: closingHour, price: currentPeriods[0].price }];
      form.setValue(field, nextPeriods, { shouldDirty: true, shouldValidate: true });
    }
  }

  const openingHour = useWatch({ control: form.control, name: "opening_hour" });
  const closingHour = useWatch({ control: form.control, name: "closing_hour" });
  const advanceBookingDays = useWatch({ control: form.control, name: "advance_booking_days" });
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Court configuration</DialogTitle>
          <DialogDescription>These hours, prices, and player rules apply to every existing and future court.</DialogDescription>
        </DialogHeader>

        <form id="court-configuration-form" className="grid gap-5 py-2" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeSelect
              id="opening-hour"
              label="Opening time"
              value={openingHour}
              options={allHours.filter((hour) => hour < closingHour)}
              onChange={(hour) => changeHours(hour, Math.max(hour + 1, closingHour))}
              error={form.formState.errors.opening_hour?.message}
            />
            <TimeSelect
              id="closing-hour"
              label="Closing time"
              value={closingHour}
              options={Array.from({ length: 24 - openingHour }, (_, index) => openingHour + index + 1)}
              onChange={(hour) => changeHours(openingHour, hour)}
              error={form.formState.errors.closing_hour?.message}
            />
          </div>

          <RateEditor form={form} field="weekday_rates" title="Weekday Price Rate (Monday to Thursday)" description="Create consecutive price periods for every open hour." />
          <RateEditor form={form} field="weekend_rates" title="Weekend Price Rate (Friday to Sunday)" description="Weekend periods follow the same one-hour boundary rules." />

          <div className="grid gap-4 sm:grid-cols-2">
            <InputWithLabel
              label="Players included per court"
              description="Customers pay the additional-player price only after this included count."
              type="number"
              min="1"
              max="100"
              inputMode="numeric"
              {...form.register("included_players_per_court", { valueAsNumber: true })}
              error={form.formState.errors.included_players_per_court?.message}
            />
            <InputWithLabel
              label="Additional player price"
              description="Charged once per additional player for the whole reservation."
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              {...form.register("additional_player_price", { valueAsNumber: true })}
              error={form.formState.errors.additional_player_price?.message}
            />
            <SelectWithLabel
              id="advance-booking-days"
              label="Maximum advance booking days"
              description="Customers can reserve from today through this many calendar days ahead."
              required
              value={String(advanceBookingDays)}
              options={advanceBookingDayOptions}
              className="sm:col-span-2"
              onValueChange={(value) => { if (value) form.setValue("advance_booking_days", Number(value), { shouldDirty: true, shouldValidate: true }); }}
              error={form.formState.errors.advance_booking_days?.message}
            />
          </div>
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>Cancel</DialogClose>
          <Button form="court-configuration-form" type="submit" disabled={mutation.isPending || isMutationRateLimited(mutation)}>
            {mutationButtonLabel("Saving…", "Save configuration", mutation)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
