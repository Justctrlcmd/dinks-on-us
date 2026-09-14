"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FiCheck, FiChevronDown, FiChevronLeft, FiChevronRight, FiMinus, FiPlus, FiTrash2, FiUsers } from "react-icons/fi";
import { FaTableTennisPaddleBall } from "react-icons/fa6";
import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReservationClosedDates, useReservationOptions } from "@/hooks/queries/use-court-pricing";
import { ReservationPolicyBanner } from "@/components/public/reservation/reservation-policy-banner";
import { addDays, parseDateOnly, todayInTimeZone, weekStartFor } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import { equipmentForSchedule } from "@/lib/equipment-availability";
import { cn } from "@/lib/utils";
import type { ReservationOptions } from "@/types/court-pricing";
import { RESERVATION_DRAFT_STORAGE_KEY, type ReservationDraft, type ReservationSlot } from "@/types/reservation";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const subscribeToNothing = () => () => {};
function slotKey(slot: Pick<ReservationSlot, "date" | "courtId" | "startHour">) {
  return `${slot.date}-${slot.courtId}-${slot.startHour}`;
}

function firstOpenDate(start: string, min: string, closedDates: ReadonlySet<string>): string {
  let date = start < min ? min : start;
  for (let day = 0; day < 3660; day += 1) {
    if (!closedDates.has(date)) return date;
    date = addDays(date, 1);
  }
  return start < min ? min : start;
}

function WeekSelector({ selectedDate, weekStart, today, closedDates, availableCount, lockedDate, onSelectDate, onChangeWeek }: { selectedDate: string; weekStart: string; today: string; closedDates: ReadonlySet<string>; availableCount: number; lockedDate?: string; onSelectDate: (date: string) => void; onChangeWeek: (amount: number) => void }) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = dates.at(-1) ?? weekStart;
  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-6" aria-labelledby="weekly-availability-title">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs font-bold uppercase tracking-[.16em] text-energy">Choose your date</div>
        <div className="flex shrink-0 items-center gap-1">
          <CalendarDatePicker iconOnly value={selectedDate} min={today} disabledDates={closedDates} disabled={Boolean(lockedDate)} onChange={onSelectDate} />
          <Button type="button" variant="outline" size="icon-sm" aria-label="Previous week" disabled={Boolean(lockedDate) || weekStart <= weekStartFor(today)} onClick={() => onChangeWeek(-7)}><FiChevronLeft aria-hidden="true" /></Button>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Next week" disabled={Boolean(lockedDate)} onClick={() => onChangeWeek(7)}><FiChevronRight aria-hidden="true" /></Button>
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-3"><h2 id="weekly-availability-title" className="font-heading text-lg font-extrabold tracking-[-.035em] sm:text-xl">Weekly availability</h2><span className="shrink-0 text-xs font-semibold text-muted-foreground sm:text-sm">{shortDate.format(parseDateOnly(weekStart))}–{shortDate.format(parseDateOnly(weekEnd))}</span></div>
      <div className="mt-3 grid grid-cols-7 gap-1.5 sm:mt-5 sm:gap-2">
        {dates.map((date) => {
          const parsed = parseDateOnly(date);
          const isPast = date < today;
          const isClosed = closedDates.has(date);
          const selected = date === selectedDate;
          const locked = Boolean(lockedDate && date !== lockedDate);
          return <button key={date} type="button" disabled={isPast || isClosed || locked} aria-label={`${weekday.format(parsed)} ${parsed.getDate()}${isClosed ? ", Closed" : locked ? ", unavailable while another date is selected" : ""}`} aria-pressed={selected} onClick={() => onSelectDate(date)} className={cn("min-w-0 rounded-lg border px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed sm:min-h-28 sm:rounded-xl sm:px-3 sm:py-3", selected && date !== today && "border-primary bg-primary text-primary-foreground shadow-sm", (!selected || date === today) && !isPast && !isClosed && !locked && "border-border bg-background hover:border-primary/55 hover:bg-muted", (isPast || locked) && "border-border/60 bg-muted/45 text-muted-foreground opacity-55", isClosed && "border-destructive/35 bg-destructive/10 text-destructive")}>
            <span className="block text-[0.58rem] font-bold uppercase tracking-[.08em] opacity-75 sm:text-xs sm:tracking-[.14em]">{weekday.format(parsed)}</span><span className="mt-0.5 block font-heading text-lg font-extrabold sm:mt-1 sm:text-2xl">{parsed.getDate()}</span><span className="mt-1 hidden text-xs font-bold sm:block">{isClosed ? "Closed" : isPast ? "Past" : locked ? "Other date selected" : selected ? `${availableCount} available` : "View slots"}</span>
          </button>;
        })}
      </div>
    </section>
  );
}

function SlotButton({ slot, selected, compact = false, onToggle }: { slot: ReservationSlot; selected: boolean; compact?: boolean; onToggle: (slot: ReservationSlot) => void }) {
  const status = slot.availabilityStatus ?? (slot.available ? "available" : "closed");
  const unavailableLabel = status === "reserved" ? "Reserved" : status === "past" ? "Past" : "Closed";
  const label = `${selected ? "Remove" : "Select"} ${slot.courtName}, ${formatHourRange(slot.startHour, slot.endHour)}, ${currency.format(slot.price)}`;
  return <button type="button" disabled={!slot.available && !selected} aria-pressed={selected} aria-label={selected ? label : slot.available ? label : `${slot.courtName}, ${formatHourRange(slot.startHour, slot.endHour)}, ${unavailableLabel.toLowerCase()}`} onClick={() => onToggle(slot)} className={cn("relative flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-2 text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", slot.available && !selected && "border-primary/30 bg-card text-foreground hover:border-primary hover:bg-muted", selected && "border-primary bg-primary text-primary-foreground", !slot.available && !selected && status === "reserved" && "cursor-not-allowed border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300", !slot.available && !selected && status === "closed" && "cursor-not-allowed border-destructive/30 bg-destructive/10 text-destructive", !slot.available && !selected && status === "past" && "cursor-not-allowed border-border/60 bg-muted/45 text-muted-foreground opacity-65", compact && "min-h-18 flex-col gap-1 px-1 text-xs")}>
    {selected ? <span className="absolute -top-2 -right-2 z-10 flex size-5 items-center justify-center rounded-full bg-energy text-energy-foreground shadow-sm ring-2 ring-card"><FiCheck className="size-3.5" aria-hidden="true" /></span> : null}
    {compact ? <span className="text-center font-heading text-sm font-extrabold uppercase tracking-[.08em]">{slot.courtName}</span> : null}<span>{selected ? currency.format(slot.price) : slot.available ? currency.format(slot.price) : unavailableLabel}</span>
  </button>;
}

function Availability({ date, options, loading, error, selectedSlots, onToggle, onRetry }: { date: string; options?: ReservationOptions; loading: boolean; error: boolean; selectedSlots: ReservationSlot[]; onToggle: (slot: ReservationSlot) => void; onRetry: () => void }) {
  const selectedKeys = new Set(selectedSlots.map(slotKey));
  const unavailableSlots = new Set((options?.unavailable_slots ?? []).map((slot) => `${slot.court_id}-${slot.start_hour}`));
  const reservedSlots = new Set((options?.reserved_slots ?? []).map((slot) => `${slot.court_id}-${slot.start_hour}`));
  const pastSlots = new Set((options?.past_slots ?? []).map((slot) => `${slot.court_id}-${slot.start_hour}`));
  const rows = (options?.slots ?? []).map((period) => ({ hour: period.start_hour, slots: (options?.courts ?? []).map((court) => {
    const key = `${court.id}-${period.start_hour}`;
    const available = !unavailableSlots.has(key);
    return { courtId: court.id, courtName: court.name, date, startHour: period.start_hour, endHour: period.end_hour, price: period.price, available, availabilityStatus: available ? "available" as const : pastSlots.has(key) ? "past" as const : reservedSlots.has(key) ? "reserved" as const : "closed" as const };
  }) }));
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6" aria-labelledby="court-times-title">
      <div className="flex flex-col items-start gap-1.5 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.2em] text-energy">Choose your time</p><h2 id="court-times-title" className="mt-1 truncate font-heading text-xl font-extrabold tracking-[-.035em] sm:text-2xl">{longDate.format(parseDateOnly(date))}</h2></div><p className="text-[.68rem] font-semibold text-muted-foreground sm:shrink-0 sm:whitespace-nowrap sm:text-xs">Prices shown per court, per hour</p></div>
      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading court availability…</p> : error ? <div className="grid justify-items-center gap-3 py-10 text-center"><p className="text-sm text-muted-foreground">Court availability could not be loaded.</p><Button variant="outline" onClick={onRetry}>Try again</Button></div> : !options?.configuration || options.courts.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Court availability has not been configured yet.</p> : (
        <>
          {options.is_date_closed ? <p role="status" className="mt-5 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium text-foreground">The entire operation is closed for this date. All court times are unavailable.</p> : null}
          <div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[42rem] table-fixed border-separate border-spacing-y-1" aria-label={`Court availability for ${longDate.format(parseDateOnly(date))}`}><thead><tr><th scope="col" className="w-40 px-2 pb-2 text-left text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Time</th>{options.courts.map((court) => <th key={court.id} scope="col" className="px-1 pb-2 text-center"><span className="flex min-h-12 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 px-3 font-heading text-base font-extrabold uppercase tracking-[.1em] text-primary">{court.name}</span></th>)}</tr></thead><tbody>{rows.map(({ hour, slots }) => <tr key={hour}><th scope="row" className="whitespace-nowrap px-2 text-left text-xs font-semibold text-muted-foreground xl:text-sm">{formatHourRange(hour, hour + 1)}</th>{slots.map((slot) => <td key={slotKey(slot)} className="px-1"><SlotButton slot={slot} selected={selectedKeys.has(slotKey(slot))} onToggle={onToggle} /></td>)}</tr>)}</tbody></table></div>
          <div className="mt-5 grid gap-3 md:hidden">{rows.map(({ hour, slots }) => <article key={hour} className="rounded-xl border border-border bg-background p-3"><h3 className="text-sm font-extrabold">{formatHourRange(hour, hour + 1)}</h3><div className="mt-3 grid grid-cols-1 gap-2">{slots.map((slot) => <SlotButton key={slotKey(slot)} slot={slot} selected={selectedKeys.has(slotKey(slot))} compact onToggle={onToggle} />)}</div></article>)}</div>
        </>
      )}
    </section>
  );
}

function AdditionalPlayers({ included, price, quantity, disabled, onChange }: { included: number; price: number; quantity: number; disabled: boolean; onChange: (amount: number) => void }) {
  return <section className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-4 rounded-2xl border border-primary/35 bg-card p-4 sm:flex sm:items-center sm:gap-5 sm:p-7">
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-energy/15 text-energy sm:size-14"><FiUsers className="size-5 sm:size-6" aria-hidden="true" /></span>
    <div className="min-w-0 flex-1"><h2 className="font-heading text-lg font-extrabold tracking-[-.035em] sm:text-2xl">Add additional players?</h2><p className="mt-1 text-sm leading-5 text-muted-foreground sm:text-base">Each court includes up to {included} players. Each additional player adds {currency.format(price)} once for the whole reservation.</p></div>
    <div className="col-span-2 flex justify-end sm:ml-auto" aria-label="Additional player quantity"><div className="flex shrink-0 items-center rounded-full border border-border bg-background p-1"><Button type="button" variant="ghost" size="icon-lg" aria-label="Remove one additional player" disabled={disabled || quantity === 0} onClick={() => onChange(-1)}><FiMinus aria-hidden="true" /></Button><output className="w-10 text-center font-heading text-lg font-extrabold" aria-live="polite">{quantity}</output><Button type="button" variant="ghost" size="icon-lg" aria-label="Add one additional player" disabled={disabled} onClick={() => onChange(1)}><FiPlus aria-hidden="true" /></Button></div></div>
  </section>;
}

function EquipmentRental({ open, options, quantities, selectedSlotCount, onToggleOpen, onChangeQuantity }: { open: boolean; options: ReservationOptions; quantities: Record<number, number>; selectedSlotCount: number; onToggleOpen: () => void; onChangeQuantity: (id: number, amount: number) => void }) {
  return <section id="equipment-rental" className="overflow-hidden rounded-2xl border border-primary/35 bg-card">
    <button type="button" aria-expanded={open} aria-controls="equipment-options" onClick={onToggleOpen} className="flex min-h-20 w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring sm:min-h-28 sm:gap-4 sm:p-7"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-energy/15 text-energy sm:size-14"><FaTableTennisPaddleBall className="size-5 sm:size-6" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block font-heading text-lg font-extrabold tracking-[-.035em] sm:text-2xl">Rent equipment?</span><span className="mt-0.5 block text-sm leading-5 text-muted-foreground sm:mt-1 sm:text-base sm:leading-6">Add available equipment for one reservation-wide price.</span></span><span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary transition-transform", open && "rotate-180")}><FiChevronDown aria-hidden="true" /></span></button>
    {open ? <div id="equipment-options" className="border-t border-border bg-background/45 p-3 sm:p-6">
      {selectedSlotCount === 0 ? <p className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground">Select at least one court slot before adding equipment.</p> : null}
      <p className="mb-4 text-sm text-muted-foreground">{options.equipment_confirmation}</p>
      {options.equipment.length === 0 ? <p className="rounded-lg border border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">No rental equipment is currently offered.</p> : <div className="grid gap-3">{options.equipment.map((item) => { const quantity = quantities[item.id] ?? 0; return <article key={item.id} className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-3 sm:min-h-24 sm:gap-4 sm:p-5"><div className="min-w-0 flex-1"><h3 className="font-heading text-base font-extrabold sm:text-lg">{item.name}</h3><p className="mt-1 font-heading text-base font-extrabold text-primary sm:text-lg">{currency.format(item.price)}</p><p className="text-xs text-muted-foreground">Per unit for this reservation</p></div><div className="grid shrink-0 justify-items-end gap-1.5"><div className="flex items-center rounded-full border border-border bg-background p-1" aria-label={`${item.name} quantity`}><Button type="button" variant="ghost" size="icon-lg" aria-label={`Remove one ${item.name}`} disabled={quantity === 0} onClick={() => onChangeQuantity(item.id, -1)}><FiMinus aria-hidden="true" /></Button><output className="w-10 text-center font-heading text-lg font-extrabold" aria-live="polite">{quantity}</output><Button type="button" variant="ghost" size="icon-lg" aria-label={`Add one ${item.name}`} disabled={selectedSlotCount === 0 || quantity >= item.available_quantity} onClick={() => onChangeQuantity(item.id, 1)}><FiPlus aria-hidden="true" /></Button></div><p className="text-xs font-medium text-muted-foreground">{selectedSlotCount === 0 ? "Choose your schedule" : item.available_quantity === 0 ? "Unavailable for selected schedule" : `${item.available_quantity} available for your selected schedule`}</p></div></article>; })}</div>}
    </div> : null}
  </section>;
}

function StickyReservationBar({ selectedSlots, total, continueDisabled, onClear, onContinue }: { selectedSlots: ReservationSlot[]; total: number; continueDisabled: boolean; onClear: () => void; onContinue: () => void }) {
  const firstSlot = selectedSlots[0];
  const courtCount = new Set(selectedSlots.map((slot) => slot.courtId)).size;
  const dateCount = new Set(selectedSlots.map((slot) => slot.date)).size;
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  if (!mounted) return null;

  return createPortal(
    <aside aria-label="Current reservation selection" aria-live="polite" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-brand-surface text-brand-surface-foreground shadow-[0_-12px_36px_rgba(0,0,0,.16)]"><div className="mx-auto grid max-w-[76rem] gap-3 px-6 py-3 sm:px-10 sm:py-4"><div className="grid min-w-0 grid-cols-4 items-center gap-3"><div className="col-span-3 min-w-0"><p className="text-sm text-white/72"><strong className="text-white">{selectedSlots.length} {selectedSlots.length === 1 ? "slot" : "slots"}</strong> across <strong className="text-energy">{courtCount} {courtCount === 1 ? "court" : "courts"}</strong> · {dateCount === 1 ? shortDate.format(parseDateOnly(firstSlot.date)) : `${dateCount} dates`}</p><p className="mt-1 truncate text-sm text-white/70">{firstSlot.courtName}: {formatHourRange(firstSlot.startHour, firstSlot.endHour)} ({currency.format(firstSlot.price)}){selectedSlots.length > 1 ? ` · +${selectedSlots.length - 1} more` : ""}</p></div><p className="col-span-1 text-right font-heading text-xl font-extrabold text-white sm:text-2xl">{currency.format(total)}</p></div><div className="grid grid-cols-4 gap-2"><Button type="button" variant="outline" size="icon-lg" aria-label="Clear reservation" className="col-span-1 h-12 w-full rounded-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={onClear}><FiTrash2 aria-hidden="true" /></Button><Button type="button" disabled={continueDisabled} className="col-span-3 h-12 rounded-full bg-energy px-4 font-extrabold text-energy-foreground hover:bg-energy/90" onClick={onContinue}>Continue to reservation <FiChevronRight aria-hidden="true" /></Button></div></div></aside>,
    document.body,
  );
}

export function ReservationExperience() {
  const router = useRouter();
  const [today] = useState(todayInTimeZone);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => weekStartFor(today));
  const [selectedSlots, setSelectedSlots] = useState<ReservationSlot[]>([]);
  const [additionalPlayers, setAdditionalPlayers] = useState(0);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [equipmentReminderOpen, setEquipmentReminderOpen] = useState(false);
  const [equipmentQuantities, setEquipmentQuantities] = useState<Record<number, number>>({});
  const closedDatesQuery = useReservationClosedDates();
  const closedDates = useMemo(() => new Set(closedDatesQuery.data ?? []), [closedDatesQuery.data]);
  const effectiveSelectedDate = closedDates.has(selectedDate) ? firstOpenDate(addDays(selectedDate, 1), today, closedDates) : selectedDate;
  const effectiveWeekStart = closedDates.has(selectedDate) ? weekStartFor(effectiveSelectedDate) : weekStart;

  const effectiveSelectedSlots = useMemo(() => selectedSlots.filter((slot) => !closedDates.has(slot.date)), [closedDates, selectedSlots]);

  const optionsQuery = useReservationOptions(effectiveSelectedDate, effectiveSelectedSlots.map((slot) => slot.startHour));
  const options = useMemo(() => optionsQuery.data ? {
    ...optionsQuery.data,
    equipment: equipmentForSchedule(optionsQuery.data, effectiveSelectedSlots.map((slot) => slot.startHour)),
  } : undefined, [optionsQuery.data, effectiveSelectedSlots]);
  const liveSelectedSlots = useMemo(() => effectiveSelectedSlots.map((selected) => {
    const court = options?.courts.find((item) => item.id === selected.courtId);
    const period = options?.slots.find((item) => item.start_hour === selected.startHour);
    const unavailable = options?.unavailable_slots.some((item) => item.court_id === selected.courtId && item.start_hour === selected.startHour) ?? true;
    return {
      ...selected,
      courtName: court?.name ?? selected.courtName,
      endHour: period?.end_hour ?? selected.endHour,
      price: period?.price ?? selected.price,
      available: Boolean(court && period) && !unavailable,
    };
  }), [effectiveSelectedSlots, options]);
  const hasUnavailableSelection = liveSelectedSlots.some((slot) => !slot.available);

  const courtSubtotal = useMemo(() => liveSelectedSlots.reduce((total, slot) => total + slot.price, 0), [liveSelectedSlots]);
  const effectiveEquipmentQuantities = useMemo(() => Object.fromEntries((options?.equipment ?? []).map((item) => [item.id, Math.min(equipmentQuantities[item.id] ?? 0, item.available_quantity)])), [equipmentQuantities, options]);
  const equipmentSubtotal = useMemo(() => (options?.equipment ?? []).reduce((total, item) => total + (effectiveEquipmentQuantities[item.id] ?? 0) * item.price, 0), [effectiveEquipmentQuantities, options]);
  const additionalSubtotal = additionalPlayers * (options?.configuration?.additional_player_price ?? 0);
  const availableCount = Math.max(0, (options?.slots.length ?? 0) * (options?.courts.length ?? 0) - (options?.unavailable_slots.length ?? 0));

  function toggleSlot(slot: ReservationSlot) {
    const nextSlots = selectedSlots.some((selected) => slotKey(selected) === slotKey(slot))
      ? selectedSlots.filter((selected) => slotKey(selected) !== slotKey(slot))
      : selectedSlots.length > 0 && selectedSlots[0].date !== slot.date
        ? selectedSlots
        : [...selectedSlots, slot];
    setSelectedSlots(nextSlots);
    if (optionsQuery.data) {
      const nextEquipment = equipmentForSchedule(optionsQuery.data, nextSlots.map((selected) => selected.startHour));
      setEquipmentQuantities((current) => Object.fromEntries(nextEquipment.map((item) => [item.id, Math.min(current[item.id] ?? 0, item.available_quantity)])));
    }
  }

  function changeEquipmentQuantity(id: number, amount: number) {
    const item = options?.equipment.find((candidate) => candidate.id === id);
    if (!item) return;
    setEquipmentQuantities((current) => ({ ...current, [id]: Math.min(item.available_quantity, Math.max(0, (effectiveEquipmentQuantities[id] ?? 0) + amount)) }));
  }

  function clearReservation() {
    setSelectedSlots([]);
    setAdditionalPlayers(0);
    setEquipmentQuantities({});
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setWeekStart(weekStartFor(date));
  }

  function continueToReservation() {
    if (!options?.configuration || hasUnavailableSelection || optionsQuery.isFetching) return;
    const draft: ReservationDraft = {
      selectedSlots: liveSelectedSlots,
      equipment: options.equipment.filter((item) => (effectiveEquipmentQuantities[item.id] ?? 0) > 0).map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: effectiveEquipmentQuantities[item.id] })),
      additionalPlayers,
      additionalPlayerUnitPrice: options.configuration.additional_player_price,
      includedPlayersPerCourt: options.configuration.included_players_per_court,
    };
    window.sessionStorage.setItem(RESERVATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    router.push("/reserve/checkout");
  }

  return <div className={cn("mx-auto max-w-[76rem] px-6 pb-16 sm:px-10", effectiveSelectedSlots.length > 0 && "pb-56 lg:pb-40")}>
    <ReservationPolicyBanner titleId="reserve-title" headingLevel="h1" />
    <div className="mt-5 grid gap-5">
      <WeekSelector selectedDate={effectiveSelectedDate} weekStart={effectiveWeekStart} today={today} closedDates={closedDates} availableCount={availableCount} lockedDate={effectiveSelectedSlots[0]?.date} onSelectDate={selectDate} onChangeWeek={(amount) => { const nextDate = firstOpenDate(addDays(effectiveWeekStart, amount), today, closedDates); setWeekStart(weekStartFor(nextDate)); setSelectedDate(nextDate); }} />
      <Availability date={effectiveSelectedDate} options={options} loading={optionsQuery.isPending} error={optionsQuery.isError} selectedSlots={effectiveSelectedSlots} onToggle={toggleSlot} onRetry={() => void optionsQuery.refetch()} />
      {hasUnavailableSelection ? <p role="alert" className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm font-medium">A selected time is no longer available. Remove the highlighted selection before continuing.</p> : null}
      {options?.configuration ? <AdditionalPlayers included={options.configuration.included_players_per_court} price={options.configuration.additional_player_price} quantity={additionalPlayers} disabled={effectiveSelectedSlots.length === 0} onChange={(amount) => setAdditionalPlayers((current) => Math.max(0, current + amount))} /> : null}
      {options ? <EquipmentRental open={equipmentOpen} options={options} quantities={effectiveEquipmentQuantities} selectedSlotCount={effectiveSelectedSlots.length} onToggleOpen={() => equipmentOpen ? setEquipmentOpen(false) : setEquipmentReminderOpen(true)} onChangeQuantity={changeEquipmentQuantity} /> : null}
    </div>
    <Dialog open={equipmentReminderOpen} onOpenChange={setEquipmentReminderOpen}><DialogContent showCloseButton={false} className="gap-5 p-6 sm:max-w-md sm:p-8"><DialogHeader className="text-left"><p className="text-xs font-bold uppercase tracking-[.18em] text-energy">Equipment reminder</p><DialogTitle className="font-heading text-2xl font-extrabold tracking-[-.04em]">Equipment is held when you submit</DialogTitle><DialogDescription className="leading-6">Availability depends on your selected schedule. Equipment is held after successful submission, including while your reservation awaits verification.</DialogDescription></DialogHeader><Button type="button" className="h-12 w-full rounded-full bg-energy font-extrabold text-energy-foreground hover:bg-energy/90" onClick={() => { setEquipmentReminderOpen(false); setEquipmentOpen(true); }}>Okay, I understand</Button></DialogContent></Dialog>
    {liveSelectedSlots.length > 0 ? <StickyReservationBar selectedSlots={liveSelectedSlots} total={courtSubtotal + equipmentSubtotal + additionalSubtotal} continueDisabled={hasUnavailableSelection || optionsQuery.isFetching} onClear={clearReservation} onContinue={continueToReservation} /> : null}
  </div>;
}
