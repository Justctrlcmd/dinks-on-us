"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
  FiMinus,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { FaRobot, FaTableTennisPaddleBall } from "react-icons/fa6";
import { GiTennisBall } from "react-icons/gi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getMockSlots,
  isMockClosedDate,
  MOCK_INITIAL_WEEK_START,
  MOCK_RESERVATION_STORAGE_KEY,
  MOCK_TODAY,
  mockCourts,
  mockEquipment,
  type MockEquipmentId,
  type MockEquipmentQuantities,
  type MockReservationDraft,
  type MockSlot,
} from "@/config/mock-reservation";
import { cn } from "@/lib/utils";

const bookingRuleGroups = [
  {
    title: "Selecting your court time",
    rules: [
      "Every court slot is one hour.",
      "You may select multiple courts and non-consecutive times in one reservation.",
      "Displayed availability is informational until your completed reservation is submitted.",
    ],
  },
  {
    title: "Rates and payment",
    rules: [
      "Court rental is calculated per selected one-hour slot.",
      "A payment reference number and receipt image are required before submission.",
      "The final amount is recalculated by the system when you submit.",
    ],
  },
  {
    title: "After submission",
    rules: [
      "No player account is required.",
      "Successfully submitted slots are held immediately while payment is waiting for staff verification.",
      "Your reservation is confirmed only after the submitted payment is verified.",
    ],
  },
] as const;

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, amount: number) {
  const date = parseDateOnly(value);
  date.setDate(date.getDate() + amount);
  return toDateOnly(date);
}

function weekStartFor(value: string) {
  const date = parseDateOnly(value);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return toDateOnly(date);
}

function formatHour(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const display = normalized % 12 || 12;
  return `${display}:00 ${suffix}`;
}

function formatTimeRange(startHour: number, endHour: number) {
  return `${formatHour(startHour)} – ${formatHour(endHour)}`;
}

function slotKey(slot: Pick<MockSlot, "date" | "courtId" | "startHour">) {
  return `${slot.date}-${slot.courtId}-${slot.startHour}`;
}

function RulesDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-10 rounded-full border-primary/40 bg-card px-3 text-xs font-extrabold text-primary hover:border-primary hover:bg-muted sm:h-11 sm:px-5 sm:text-sm" />
        }
      >
        <FiInfo aria-hidden="true" />
        View booking rules
      </DialogTrigger>
      <DialogContent className="max-h-[min(42rem,calc(100svh-2rem))] overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader className="pr-8 text-left">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-energy">Before you reserve</p>
          <DialogTitle className="font-heading text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">Court rules and booking reminders</DialogTitle>
          <DialogDescription className="leading-6">Review these details before choosing your court time. Final operating policies will be published when confirmed.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-4">
          {bookingRuleGroups.map((group, index) => (
            <section key={group.title} className="rounded-xl border border-border bg-background p-5" aria-labelledby={`rule-group-${index}`}>
              <h2 id={`rule-group-${index}`} className="font-heading text-base font-extrabold">{group.title}</h2>
              <ul className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground">
                {group.rules.map((rule) => (
                  <li key={rule} className="flex gap-3">
                    <FiCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type WeekSelectorProps = {
  selectedDate: string;
  weekStart: string;
  onSelectDate: (date: string) => void;
  onChangeWeek: (amount: number) => void;
};

function WeekSelector({ selectedDate, weekStart, onSelectDate, onChangeWeek }: WeekSelectorProps) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = dates.at(-1) ?? weekStart;
  const previousDisabled = weekStart <= MOCK_INITIAL_WEEK_START;
  const dateInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-6" aria-labelledby="weekly-availability-title">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs font-bold uppercase tracking-[.16em] text-energy">
          Choose your date
          <input
            ref={dateInputRef}
            type="date"
            min={MOCK_TODAY}
            value={selectedDate}
            onChange={(event) => onSelectDate(event.target.value)}
            className="sr-only"
            aria-label="Choose reservation date"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" aria-label="Choose a date from calendar" onClick={() => dateInputRef.current?.showPicker?.()}>
            <FiCalendar aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Previous week" disabled={previousDisabled} onClick={() => onChangeWeek(-7)}>
            <FiChevronLeft aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Next week" onClick={() => onChangeWeek(7)}>
            <FiChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className=" flex items-baseline justify-between gap-3">
        <h2 id="weekly-availability-title" className="font-heading text-lg font-extrabold tracking-[-.035em] sm:text-xl">Weekly availability</h2>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground sm:text-sm">
          {shortDate.format(parseDateOnly(weekStart))}–{shortDate.format(parseDateOnly(weekEnd))}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5 sm:mt-5 sm:gap-2">
        {dates.map((date) => {
          const parsed = parseDateOnly(date);
          const isPast = date < MOCK_TODAY;
          const closed = isMockClosedDate(date);
          const selected = date === selectedDate;
          const availableCount = isPast || closed ? 0 : getMockSlots(date).filter((slot) => slot.available).length;

          return (
            <button
              key={date}
              type="button"
              disabled={isPast || closed}
              aria-pressed={selected}
              onClick={() => onSelectDate(date)}
              className={cn(
                "min-w-0 rounded-lg border px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed sm:min-h-28 sm:rounded-xl sm:px-3 sm:py-3",
                selected && "border-primary bg-primary text-primary-foreground shadow-sm",
                !selected && !isPast && !closed && "border-border bg-background hover:border-primary/55 hover:bg-muted",
                (isPast || closed) && "border-border/60 bg-muted/45 text-muted-foreground opacity-55",
              )}
            >
              <span className="block text-[0.58rem] font-bold uppercase tracking-[.08em] opacity-75 sm:text-xs sm:tracking-[.14em]">{weekday.format(parsed)}</span>
              <span className="mt-0.5 block font-heading text-lg font-extrabold sm:mt-1 sm:text-2xl">{parsed.getDate()}</span>
              <span className="mt-1 hidden text-xs font-bold sm:block">
                {closed ? "Closed" : isPast ? "Past" : `${availableCount} available`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type SlotButtonProps = {
  slot: MockSlot;
  selected: boolean;
  compact?: boolean;
  onToggle: (slot: MockSlot) => void;
};

function SlotButton({ slot, selected, compact = false, onToggle }: SlotButtonProps) {
  const label = `${selected ? "Remove" : "Select"} ${slot.courtName}, ${formatTimeRange(slot.startHour, slot.endHour)}, ${currency.format(slot.price)}`;

  return (
    <button
      type="button"
      disabled={!slot.available}
      aria-pressed={selected}
      aria-label={slot.available ? label : `${slot.courtName}, ${formatTimeRange(slot.startHour, slot.endHour)}, unavailable`}
      onClick={() => onToggle(slot)}
      className={cn(
        "relative flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-2 text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        slot.available && !selected && "border-primary/30 bg-card text-foreground hover:border-primary hover:bg-muted",
        selected && "border-primary bg-primary text-primary-foreground",
        !slot.available && "cursor-not-allowed border-border/70 bg-muted/55 text-muted-foreground opacity-70",
        compact && "min-h-18 flex-col gap-1 px-1 text-xs",
      )}
    >
      {selected ? <span className="absolute -top-2 -right-2 z-10 flex size-5 items-center justify-center rounded-full bg-energy text-energy-foreground shadow-sm ring-2 ring-card"><FiCheck className="size-3.5" aria-hidden="true" /></span> : null}
      {compact ? <span className="font-heading text-sm font-extrabold uppercase tracking-[.08em] text-center">{slot.courtName}</span> : null}
      <span>{slot.available ? currency.format(slot.price) : "Unavailable"}</span>
    </button>
  );
}

type AvailabilityProps = {
  date: string;
  selectedSlots: MockSlot[];
  onToggle: (slot: MockSlot) => void;
};

function Availability({ date, selectedSlots, onToggle }: AvailabilityProps) {
  const slots = getMockSlots(date);
  const selectedKeys = new Set(selectedSlots.map(slotKey));
  const slotsByHour = Array.from({ length: 17 }, (_, index) => index + 7).map((hour) => ({
    hour,
    slots: slots.filter((slot) => slot.startHour === hour),
  }));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6" aria-labelledby="court-times-title">
      <div className="grid gap-3 border-b border-border pb-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 sm:pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-energy">Choose your time</p>
          <h2 id="court-times-title" className="mt-1 font-heading text-xl font-extrabold tracking-[-.035em] sm:text-2xl">
            {longDate.format(parseDateOnly(date))}
          </h2>
        </div>
        <div className="grid w-full grid-cols-4 gap-1 text-[0.62rem] font-semibold text-muted-foreground sm:flex sm:w-auto sm:gap-4 sm:text-xs" aria-label="Availability legend">
          <span className="flex items-center justify-center gap-1 whitespace-nowrap sm:gap-2"><span className="size-2.5 rounded-sm border border-primary/40 bg-card sm:size-3" aria-hidden="true" />Available</span>
          <span className="flex items-center justify-center gap-1 whitespace-nowrap sm:gap-2"><span className="size-2.5 rounded-sm bg-primary sm:size-3" aria-hidden="true" />Selected</span>
          <span className="flex items-center justify-center gap-1 whitespace-nowrap sm:gap-2"><span className="size-2.5 rounded-sm border border-energy bg-energy/20 sm:size-3" aria-hidden="true" />Booked</span>
          <span className="flex items-center justify-center gap-1 whitespace-nowrap sm:gap-2"><span className="size-2.5 rounded-sm border border-border bg-muted sm:size-3" aria-hidden="true" />Unavailable</span>
        </div>
      </div>

      <div className="mt-5 hidden md:block">
        <table className="w-full table-fixed border-separate border-spacing-y-1" aria-label={`Court availability for ${longDate.format(parseDateOnly(date))}`}>
          <thead>
            <tr>
              <th scope="col" className="w-40 px-2 pb-2 text-left text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Time</th>
              {mockCourts.map((court) => (
                <th key={court.id} scope="col" className="px-1 pb-2 text-center">
                  <span className="flex min-h-12 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 px-3 font-heading text-base font-extrabold uppercase tracking-[.1em] text-primary">
                    {court.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotsByHour.map(({ hour, slots: hourSlots }) => (
              <tr key={hour}>
                <th scope="row" className="whitespace-nowrap px-2 text-left text-xs font-semibold text-muted-foreground xl:text-sm">{formatTimeRange(hour, hour + 1)}</th>
                {hourSlots.map((slot) => (
                  <td key={slotKey(slot)} className="px-1">
                    <SlotButton slot={slot} selected={selectedKeys.has(slotKey(slot))} onToggle={onToggle} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {slotsByHour.map(({ hour, slots: hourSlots }) => (
          <article key={hour} className="rounded-xl border border-border bg-background p-3">
            <h3 className="text-sm font-extrabold text-foreground">{formatTimeRange(hour, hour + 1)}</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {hourSlots.map((slot) => (
                <SlotButton key={slotKey(slot)} slot={slot} selected={selectedKeys.has(slotKey(slot))} compact onToggle={onToggle} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type EquipmentRentalProps = {
  open: boolean;
  quantities: Record<MockEquipmentId, number>;
  selectedSlotCount: number;
  onToggleOpen: () => void;
  onChangeQuantity: (id: MockEquipmentId, amount: number) => void;
};

const equipmentIcons = {
  paddle: FaTableTennisPaddleBall,
  ball: GiTennisBall,
  "titan-machine": FaRobot,
} as const;

function EquipmentRental({ open, quantities, selectedSlotCount, onToggleOpen, onChangeQuantity }: EquipmentRentalProps) {
  return (
    <section id="equipment-rental" className="overflow-hidden rounded-2xl border border-primary/35 bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="equipment-options"
        onClick={onToggleOpen}
        className="flex min-h-20 w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring sm:min-h-28 sm:gap-4 sm:p-7"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-energy/15 text-energy sm:size-14">
          <FaTableTennisPaddleBall className="size-5 sm:size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-lg font-extrabold tracking-[-.035em] sm:text-2xl">Rent equipment?</span>
          <span className="mt-0.5 block text-sm leading-5 text-muted-foreground sm:mt-1 sm:text-base sm:leading-6">Add paddles, balls, or a ball machine to your booking.</span>
        </span>
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary transition-transform", open && "rotate-180")}>
          <FiChevronDown aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div id="equipment-options" className="border-t border-border bg-background/45 p-3 sm:p-6">
          {selectedSlotCount === 0 ? (
            <p className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground">Select at least one court slot before adding equipment.</p>
          ) : null}
          <div className="grid gap-3">
            {mockEquipment.map((item) => {
              const Icon = equipmentIcons[item.id];
              const maximum = item.id === "titan-machine" ? selectedSlotCount : item.maximum;
              const quantity = quantities[item.id];

              return (
                <article key={item.id} className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3 sm:min-h-24 sm:gap-4 sm:p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-energy/15 text-energy sm:size-12"><Icon className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-base font-extrabold sm:text-lg">{item.name}</h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">{currency.format(item.price)} {item.unit}</p>
                  </div>
                  <div className="flex shrink-0 items-center rounded-full border border-border bg-background p-1" aria-label={`${item.name} quantity`}>
                    <Button type="button" variant="ghost" size="icon-lg" aria-label={`Remove one ${item.name}`} disabled={quantity === 0} onClick={() => onChangeQuantity(item.id, -1)}>
                      <FiMinus aria-hidden="true" />
                    </Button>
                    <output className="w-10 text-center font-heading text-lg font-extrabold" aria-live="polite">{quantity}</output>
                    <Button type="button" variant="ghost" size="icon-lg" aria-label={`Add one ${item.name}`} disabled={selectedSlotCount === 0 || quantity >= maximum} onClick={() => onChangeQuantity(item.id, 1)}>
                      <FiPlus aria-hidden="true" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

        </div>
      ) : null}
    </section>
  );
}

type StickyBookingBarProps = {
  selectedSlots: MockSlot[];
  total: number;
  onClear: () => void;
  onContinue: () => void;
};

function StickyBookingBar({ selectedSlots, total, onClear, onContinue }: StickyBookingBarProps) {
  const courtCount = new Set(selectedSlots.map((slot) => slot.courtId)).size;
  const dateCount = new Set(selectedSlots.map((slot) => slot.date)).size;
  const firstSlot = selectedSlots[0];
  const dateLabel = dateCount === 1 ? shortDate.format(parseDateOnly(firstSlot.date)) : `${dateCount} dates`;

  return (
    <aside aria-label="Current booking selection" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-brand-surface text-brand-surface-foreground shadow-[0_-12px_36px_rgba(0,0,0,.16)] motion-safe:animate-in motion-safe:slide-in-from-bottom-4">
      <div className="mx-auto grid max-w-[96rem] gap-3 px-4 py-3 sm:px-10 sm:py-4 lg:px-30">
        <div className="grid min-w-0 grid-cols-4 items-center gap-3">
          <div className="col-span-3 min-w-0">
          <p className="text-sm text-white/72">
            <strong className="text-white">{selectedSlots.length} {selectedSlots.length === 1 ? "slot" : "slots"}</strong> across <strong className="text-energy">{courtCount} {courtCount === 1 ? "court" : "courts"}</strong> · {dateLabel}
          </p>
          <p className="mt-1 truncate text-sm text-white/70">
            {firstSlot.courtName}: {formatTimeRange(firstSlot.startHour, firstSlot.endHour)} ({currency.format(firstSlot.price)})
            {selectedSlots.length > 1 ? ` · +${selectedSlots.length - 1} more` : ""}
          </p>
          </div>
          <p className="col-span-1 text-right font-heading text-xl font-extrabold text-white sm:text-2xl">{currency.format(total)}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Button type="button" variant="outline" size="icon-lg" aria-label="Clear booking" className="col-span-1 h-12 w-full rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={onClear}>
            <FiTrash2 aria-hidden="true" />
          </Button>
          <Button type="button" className="col-span-3 h-12 rounded-full bg-energy px-4 font-extrabold text-energy-foreground hover:bg-energy/90" onClick={onContinue}>
            Continue to book <FiChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

const initialEquipmentQuantities: MockEquipmentQuantities = {
  paddle: 0,
  ball: 0,
  "titan-machine": 0,
};

export function ReservationExperience() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(MOCK_TODAY);
  const [weekStart, setWeekStart] = useState(MOCK_INITIAL_WEEK_START);
  const [selectedSlots, setSelectedSlots] = useState<MockSlot[]>([]);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [equipmentReminderOpen, setEquipmentReminderOpen] = useState(false);
  const [equipmentQuantities, setEquipmentQuantities] = useState(initialEquipmentQuantities);

  const courtSubtotal = useMemo(() => selectedSlots.reduce((total, slot) => total + slot.price, 0), [selectedSlots]);
  const equipmentSubtotal = useMemo(
    () => mockEquipment.reduce((total, item) => total + equipmentQuantities[item.id] * item.price, 0),
    [equipmentQuantities],
  );

  function toggleSlot(slot: MockSlot) {
    setSelectedSlots((current) => {
      const key = slotKey(slot);
      const exists = current.some((selected) => slotKey(selected) === key);
      const next = exists ? current.filter((selected) => slotKey(selected) !== key) : [...current, slot];

      if (equipmentQuantities["titan-machine"] > next.length) {
        setEquipmentQuantities((quantities) => ({ ...quantities, "titan-machine": next.length }));
      }

      return next;
    });
  }

  function changeEquipmentQuantity(id: MockEquipmentId, amount: number) {
    setEquipmentQuantities((current) => {
      const item = mockEquipment.find((candidate) => candidate.id === id);
      const maximum = id === "titan-machine" ? selectedSlots.length : item?.maximum ?? 0;
      const next = Math.min(maximum, Math.max(0, current[id] + amount));
      return { ...current, [id]: next };
    });
  }

  function clearBooking() {
    setSelectedSlots([]);
    setEquipmentQuantities(initialEquipmentQuantities);
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setWeekStart(weekStartFor(date));
  }

  function changeWeek(amount: number) {
    const nextWeekStart = addDays(weekStart, amount);
    const nextSelectedDate = Array.from({ length: 7 }, (_, index) => addDays(nextWeekStart, index)).find(
      (date) => date >= MOCK_TODAY && !isMockClosedDate(date),
    );

    setWeekStart(nextWeekStart);
    if (nextSelectedDate) setSelectedDate(nextSelectedDate);
  }

  function continueToBooking() {
    const draft: MockReservationDraft = { selectedSlots, equipmentQuantities };
    window.sessionStorage.setItem(MOCK_RESERVATION_STORAGE_KEY, JSON.stringify(draft));
    router.push("/reserve/checkout");
  }

  function requestEquipmentRental() {
    if (equipmentOpen) {
      setEquipmentOpen(false);
      return;
    }

    setEquipmentReminderOpen(true);
  }

  function acknowledgeEquipmentReminder() {
    setEquipmentReminderOpen(false);
    setEquipmentOpen(true);
  }

  return (
    <div className={cn("mx-auto max-w-[96rem] px-4 pb-16 sm:px-10 lg:px-30", selectedSlots.length > 0 && "pb-56 lg:pb-40")}>
      <section className="rounded-2xl border border-primary/35 bg-card p-3 sm:p-6" aria-labelledby="reserve-title">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 id="reserve-title" className="whitespace-nowrap font-heading text-base font-extrabold tracking-[-.025em] text-primary sm:text-xl">Court reservation</h1>
            <p className="mt-1 hidden max-w-3xl leading-7 text-muted-foreground sm:block">Availability updates as reservations are submitted. Review the rules and reminders before choosing your court time.</p>
          </div>
          <RulesDialog />
        </div>
      </section>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <WeekSelector selectedDate={selectedDate} weekStart={weekStart} onSelectDate={selectDate} onChangeWeek={changeWeek} />
        <Availability date={selectedDate} selectedSlots={selectedSlots} onToggle={toggleSlot} />
        <EquipmentRental
          open={equipmentOpen}
          quantities={equipmentQuantities}
          selectedSlotCount={selectedSlots.length}
          onToggleOpen={requestEquipmentRental}
          onChangeQuantity={changeEquipmentQuantity}
        />
      </div>

      <Dialog open={equipmentReminderOpen} onOpenChange={setEquipmentReminderOpen}>
        <DialogContent showCloseButton={false} className="gap-5 p-6 sm:max-w-md sm:p-8">
          <DialogHeader className="text-left">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-energy">Equipment reminder</p>
            <DialogTitle className="font-heading text-2xl font-extrabold tracking-[-.04em]">Use equipment during your reserved court time</DialogTitle>
            <DialogDescription className="leading-6">
              Rental equipment is only available while your selected court slots are active. Titan Machine hours cannot exceed your selected court slots.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="h-12 w-full rounded-full bg-energy font-extrabold text-energy-foreground hover:bg-energy/90" onClick={acknowledgeEquipmentReminder}>
            Okay, I understand
          </Button>
        </DialogContent>
      </Dialog>

      {selectedSlots.length > 0 ? (
        <StickyBookingBar selectedSlots={selectedSlots} total={courtSubtotal + equipmentSubtotal} onClear={clearBooking} onContinue={continueToBooking} />
      ) : null}
    </div>
  );
}
