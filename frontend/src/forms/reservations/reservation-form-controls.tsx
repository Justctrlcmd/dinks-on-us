"use client";

import { FiChevronDown, FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReservationClosedDates, useReservationOptions } from "@/hooks/queries/use-court-pricing";
import { todayInTimeZone } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import type { SlotInput } from "@/types/reservation";

export type ReservationSlotSelection = { courtId: string; slots: string[] };
type AllowedCurrentSlot = { court_id: number; start_hour: number; date?: string };

type TimeSlotOption = { value: string; label: string; disabled?: boolean };

function TimeSlotMultiSelect({ id, options, value, onChange, disabled, placeholder = "Select time slots" }: {
  id: string;
  options: readonly TimeSlotOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const selectedOptions = options.filter((option) => value.includes(option.value));
  const triggerLabel = selectedOptions.length === 0
    ? placeholder
    : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} time slots selected`;

  function toggleOption(option: TimeSlotOption, checked: boolean) {
    const nextValues = checked
      ? [...value, option.value]
      : value.filter((selectedValue) => selectedValue !== option.value);
    onChange(options.filter((candidate) => nextValues.includes(candidate.value)).map((candidate) => candidate.value));
  }

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        aria-label="Time slots"
        render={<Button type="button" variant="outline" disabled={disabled} className="h-10 w-full justify-between font-normal" />}
      >
        <span className={selectedOptions.length === 0 ? "text-muted-foreground" : "truncate"}>{triggerLabel}</span>
        <FiChevronDown className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) max-h-72 overflow-y-auto p-2">
        <div className="grid gap-1" role="group" aria-label="Time slot options">
          {options.map((option) => (
            <label
              key={option.value}
              htmlFor={`${id}-${option.value}`}
              className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${option.disabled ? "cursor-not-allowed text-muted-foreground/60" : "cursor-pointer hover:bg-muted"}`}
              onClick={(event) => {
                if (!option.disabled && !(event.target as HTMLElement).closest('[role="checkbox"]')) {
                  toggleOption(option, !value.includes(option.value));
                }
              }}
            >
              <Checkbox
                id={`${id}-${option.value}`}
                checked={value.includes(option.value)}
                disabled={option.disabled}
                onCheckedChange={(checked) => toggleOption(option, checked === true)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  disableClosedDates = true,
  showDate = true,
  maxSelectedSlots,
  optionsScope = "management",
  idPrefix = "reservation",
  onRemoveRange,
  error,
}: {
  date: string;
  setDate: (date: string) => void;
  ranges: ReservationSlotSelection[];
  setRanges: (ranges: ReservationSlotSelection[]) => void;
  allowedCurrentSlots?: AllowedCurrentSlot[];
  dateLocked?: boolean;
  disableClosedDates?: boolean;
  showDate?: boolean;
  maxSelectedSlots?: number;
  optionsScope?: "public" | "management";
  idPrefix?: string;
  onRemoveRange?: (index: number) => void;
  error?: string;
}) {
  const optionsQuery = useReservationOptions(date, [], optionsScope);
  const closedDatesQuery = useReservationClosedDates();
  const options = optionsQuery.data;
  const unavailable = new Set((options?.unavailable_slots ?? []).map((slot) => `${slot.court_id}-${slot.start_hour}`));
  const allowed = new Set(allowedCurrentSlots.filter((slot) => !slot.date || slot.date === date).map((slot) => `${slot.court_id}-${slot.start_hour}`));
  const selectedSlotCount = ranges.reduce((total, range) => total + range.slots.length, 0);

  function update(index: number, change: Partial<ReservationSlotSelection>) {
    setRanges(ranges.map((range, rangeIndex) => rangeIndex === index ? { ...range, ...change } : range));
  }

  function changeDate(nextDate: string) {
    setDate(nextDate);
    setRanges(ranges.map(() => ({ courtId: "", slots: [] })));
  }

  return (
    <div className="grid gap-4">
      {showDate ? <FormFieldWrapper id={`${idPrefix}-date`} label="Date" required>
        <CalendarDatePicker
          id={`${idPrefix}-date`}
          value={date}
          min={todayInTimeZone()}
          disabledDates={disableClosedDates ? (closedDatesQuery.data ?? []) : []}
          disabled={dateLocked}
          onChange={changeDate}
          placeholder="Select reservation date"
        />
      </FormFieldWrapper> : null}

      {optionsQuery.isError ? <p role="alert" className="text-sm text-destructive">Court availability could not be loaded. Try another date or refresh the page.</p> : null}

      {ranges.map((range, index) => {
        const timeSlotOptions = options?.slots.map((slot) => {
          const key = `${range.courtId}-${slot.start_hour}`;
          const booked = Boolean(range.courtId && unavailable.has(key) && !allowed.has(key));
          const selectedElsewhere = ranges.some((candidate, candidateIndex) => candidateIndex !== index && candidate.courtId === range.courtId && candidate.slots.includes(String(slot.start_hour)));
          const selected = range.slots.includes(String(slot.start_hour));
          const atSelectionLimit = maxSelectedSlots !== undefined && selectedSlotCount >= maxSelectedSlots && !selected;
          return {
            value: String(slot.start_hour),
            label: formatHourRange(slot.start_hour, slot.end_hour),
            disabled: !selected && (booked || selectedElsewhere || atSelectionLimit),
          };
        }) ?? [];

        return (
          <div key={index} className="relative grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
            <SelectWithLabel
              id={`${idPrefix}-court-${index}`}
              label="Court"
              required
              value={range.courtId || null}
              options={options?.courts.map((court) => ({ value: String(court.id), label: court.name })) ?? []}
              placeholder={optionsQuery.isPending ? "Loading courts…" : "Select court"}
              disabled={optionsQuery.isPending || optionsQuery.isError}
              onValueChange={(value) => update(index, { courtId: value ?? "", slots: [] })}
            />
            <FormFieldWrapper id={`${idPrefix}-slot-${index}`} label="Time slots" required>
              <TimeSlotMultiSelect
                id={`${idPrefix}-slot-${index}`}
                value={range.slots}
                options={timeSlotOptions}
                placeholder={range.courtId ? "Select time slots" : "Select a court first"}
                disabled={!date || !range.courtId || optionsQuery.isPending || optionsQuery.isError}
                onChange={(value) => update(index, { slots: value })}
              />
            </FormFieldWrapper>
            {onRemoveRange && index > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-2 z-10 text-destructive hover:text-destructive"
                aria-label={`Remove court ${index + 1}`}
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
  return ranges.flatMap((range) => range.courtId
    ? range.slots.map((slot) => ({ court_id: Number(range.courtId), date, start_hour: Number(slot) }))
    : []);
}
