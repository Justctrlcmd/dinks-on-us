"use client";

import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { useReservationClosedDates, useReservationOptions } from "@/hooks/queries/use-court-pricing";
import { todayInTimeZone } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import type { SlotInput } from "@/types/reservation";

export type ReservationSlotSelection = { courtId: string; slot: string };
type AllowedCurrentSlot = { court_id: number; start_hour: number; date?: string };

export function ReservationQuantityStepper({
  value,
  onDecrease,
  onIncrease,
  decreaseDisabled,
  increaseDisabled,
  decreaseLabel,
  increaseLabel,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div className="flex w-24 shrink-0 items-center justify-between" aria-label="Quantity">
      <Button type="button" variant="outline" size="icon-sm" aria-label={decreaseLabel} disabled={decreaseDisabled} onClick={onDecrease}>
        <FiMinus aria-hidden="true" />
      </Button>
      <output className="w-8 text-center font-bold" aria-live="polite">{value}</output>
      <Button type="button" variant="outline" size="icon-sm" aria-label={increaseLabel} disabled={increaseDisabled} onClick={onIncrease}>
        <FiPlus aria-hidden="true" />
      </Button>
    </div>
  );
}

export function ReservationScheduleFields({
  date,
  setDate,
  ranges,
  setRanges,
  allowedCurrentSlots = [],
  dateLocked = false,
  onRemoveRange,
  error,
}: {
  date: string;
  setDate: (date: string) => void;
  ranges: ReservationSlotSelection[];
  setRanges: (ranges: ReservationSlotSelection[]) => void;
  allowedCurrentSlots?: AllowedCurrentSlot[];
  dateLocked?: boolean;
  onRemoveRange?: (index: number) => void;
  error?: string;
}) {
  const optionsQuery = useReservationOptions(date);
  const closedDatesQuery = useReservationClosedDates();
  const options = optionsQuery.data;
  const unavailable = new Set((options?.unavailable_slots ?? []).map((slot) => `${slot.court_id}-${slot.start_hour}`));
  const reserved = new Set((options?.reserved_slots ?? []).map((slot) => `${slot.court_id}-${slot.start_hour}`));
  const allowed = new Set(allowedCurrentSlots.filter((slot) => !slot.date || slot.date === date).map((slot) => `${slot.court_id}-${slot.start_hour}`));

  function update(index: number, change: Partial<ReservationSlotSelection>) {
    setRanges(ranges.map((range, rangeIndex) => rangeIndex === index ? { ...range, ...change } : range));
  }

  function changeDate(nextDate: string) {
    setDate(nextDate);
    setRanges(ranges.map(() => ({ courtId: "", slot: "" })));
  }

  return (
    <div className="grid gap-4">
      <FormFieldWrapper id="reservation-date" label="Date" required>
        <CalendarDatePicker
          id="reservation-date"
          value={date}
          min={todayInTimeZone()}
          disabledDates={closedDatesQuery.data ?? []}
          disabled={dateLocked}
          onChange={changeDate}
          placeholder="Select reservation date"
        />
      </FormFieldWrapper>

      {optionsQuery.isError ? <p role="alert" className="text-sm text-destructive">Court availability could not be loaded. Try another date or refresh the page.</p> : null}

      {ranges.map((range, index) => {
        const timeSlotOptions = options?.slots.map((slot) => {
          const key = `${range.courtId}-${slot.start_hour}`;
          const booked = Boolean(range.courtId && unavailable.has(key) && !allowed.has(key));
          const reservedSlot = booked && reserved.has(key);
          const selectedElsewhere = ranges.some((candidate, candidateIndex) => candidateIndex !== index && candidate.courtId === range.courtId && candidate.slot === String(slot.start_hour));
          return {
            value: String(slot.start_hour),
            label: `${formatHourRange(slot.start_hour, slot.end_hour)}${reservedSlot ? " · Reserved" : booked ? " · Closed" : selectedElsewhere ? " · Selected" : ""}`,
            disabled: booked || selectedElsewhere,
          };
        }) ?? [];

        return (
          <div key={index} className="relative grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
            <SelectWithLabel
              id={`reservation-court-${index}`}
              label="Court"
              required
              value={range.courtId || null}
              options={options?.courts.map((court) => ({ value: String(court.id), label: court.name })) ?? []}
              placeholder={optionsQuery.isPending ? "Loading courts…" : "Select court"}
              disabled={optionsQuery.isPending || optionsQuery.isError}
              onValueChange={(value) => update(index, { courtId: value ?? "", slot: "" })}
            />
            <SelectWithLabel
              id={`reservation-slot-${index}`}
              label="Time slot"
              required
              value={range.slot || null}
              options={timeSlotOptions}
              placeholder={range.courtId ? "Select time slot" : "Select a court first"}
              disabled={!date || !range.courtId || optionsQuery.isPending || optionsQuery.isError}
              onValueChange={(value) => update(index, { slot: value ?? "" })}
            />
            {onRemoveRange && index > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-2 z-10 text-destructive hover:text-destructive"
                aria-label={`Remove time slot ${index + 1}`}
                onClick={() => onRemoveRange(index)}
              >
                <FiTrash2 aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        );
      })}
      {error ? <p role="alert" className="text-xs leading-4 text-destructive">{error}</p> : null}
    </div>
  );
}

export function expandReservationRanges(date: string, ranges: ReservationSlotSelection[]): SlotInput[] {
  return ranges.flatMap((range) => range.courtId && range.slot
    ? [{ court_id: Number(range.courtId), date, start_hour: Number(range.slot) }]
    : []);
}
