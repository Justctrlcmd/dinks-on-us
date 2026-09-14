"use client";

import { useMemo, useState } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateOnly, parseDateOnly, toDateOnly, todayInTimeZone } from "@/lib/date";
import { cn } from "@/lib/utils";

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthStart(value: string): Date {
  const date = parseDateOnly(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function calendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
}

export function ThemedCalendar({ value, min, max, disabledDates = [], onChange, onClear }: {
  value?: string;
  min?: string;
  max?: string;
  disabledDates?: Iterable<string>;
  onChange: (value: string) => void;
  onClear?: () => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(value || min || todayInTimeZone()));
  const disabled = useMemo(() => new Set(disabledDates), [disabledDates]);
  const today = todayInTimeZone();
  const days = calendarDays(visibleMonth);
  const earliestMonth = min ? monthStart(min) : null;
  const latestMonth = max ? monthStart(max) : null;
  const previousDisabled = earliestMonth ? visibleMonth <= earliestMonth : false;
  const nextDisabled = latestMonth ? visibleMonth >= latestMonth : false;

  function changeMonth(amount: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <div className="w-[19rem] max-w-[calc(100vw-2rem)]" aria-label="Calendar">
      <div className="flex items-center justify-between gap-3 px-0.5 pb-3">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous month" disabled={previousDisabled} onClick={() => changeMonth(-1)}><FiChevronLeft aria-hidden="true" /></Button>
        <p className="font-heading text-sm font-bold">{monthLabel.format(visibleMonth)}</p>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Next month" disabled={nextDisabled} onClick={() => changeMonth(1)}><FiChevronRight aria-hidden="true" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid">
        {weekDays.map((day) => <div key={day} role="columnheader" className="py-1 text-center text-[0.65rem] font-bold uppercase tracking-[.08em] text-muted-foreground">{day}</div>)}
        {days.map((day) => {
          const date = toDateOnly(day);
          const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
          const closed = disabled.has(date);
          const unavailable = Boolean((min && date < min) || (max && date > max)) || closed;
          const selected = value === date;
          const isToday = date === (min ?? today);
          const ariaLabel = `${dayLabel.format(day)}${closed ? ", Closed" : ""}`;

          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-label={ariaLabel}
              aria-selected={selected}
              disabled={unavailable}
              onClick={() => onChange(date)}
              className={cn(
                "flex min-h-10 flex-col items-center justify-center rounded-lg border border-transparent px-0.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                outsideMonth && "text-muted-foreground/55",
                !outsideMonth && !unavailable && "hover:border-primary/40 hover:bg-accent/45",
                selected && !isToday && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                unavailable && !closed && "cursor-not-allowed text-muted-foreground/35",
                closed && "cursor-not-allowed border-destructive/25 bg-destructive/10 text-destructive",
              )}
            >
              <span>{day.getDate()}</span>
              {closed ? <span className="text-[0.5rem] font-bold uppercase leading-none">Closed</span> : null}
            </button>
          );
        })}
      </div>
      {onClear ? <div className="mt-3 flex justify-end border-t border-border pt-2"><Button type="button" variant="ghost" size="sm" onClick={onClear}>Clear date</Button></div> : (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-[0.68rem] font-medium text-muted-foreground">
          <span className="size-2.5 rounded-sm bg-destructive/20 ring-1 ring-destructive/40" aria-hidden="true" />Closed dates are unavailable
        </div>
      )}
    </div>
  );
}

export function CalendarDatePicker({ id, value, min, max, disabledDates, onChange, onClear, placeholder = "Select a date", iconOnly = false, invalid = false, disabled = false }: {
  id?: string;
  value?: string;
  min?: string;
  max?: string;
  disabledDates?: Iterable<string>;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  iconOnly?: boolean;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-label={iconOnly ? "Choose a date from calendar" : undefined}
        aria-invalid={invalid || undefined}
        render={<Button type="button" variant="outline" size={iconOnly ? "icon-sm" : "default"} disabled={disabled} className={iconOnly ? undefined : "h-10 w-full justify-between font-normal"} />}
      >
        {iconOnly ? <FiCalendar aria-hidden="true" /> : <><span>{value ? formatDateOnly(value) : placeholder}</span><FiCalendar aria-hidden="true" className="text-muted-foreground" /></>}
      </PopoverTrigger>
      <PopoverContent
        align={iconOnly ? "end" : "start"}
        collisionAvoidance={iconOnly ? undefined : { side: "shift", align: "shift", fallbackAxisSide: "none" }}
      >
        <ThemedCalendar key={value || min || max} value={value} min={min} max={max} disabledDates={disabledDates} onChange={(date) => { onChange(date); setOpen(false); }} onClear={onClear ? () => { onClear(); setOpen(false); } : undefined} />
      </PopoverContent>
    </Popover>
  );
}
