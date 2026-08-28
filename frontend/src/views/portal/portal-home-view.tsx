"use client";

import { useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEye,
  FiPlay,
  FiSlash,
  FiUserX,
  FiXCircle,
} from "react-icons/fi";
import { LuPhilippinePeso } from "react-icons/lu";

import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationDetailDialog } from "@/forms/reservations/reservation-dialogs";
import { useDashboard } from "@/hooks/queries/use-dashboard";
import { addDays, parseDateOnly, todayInTimeZone, weekStartFor } from "@/lib/date";
import { formatHourRange } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { DashboardSlot, DashboardSlotStatus } from "@/types/dashboard";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });

const slotPresentation: Record<DashboardSlotStatus, {
  label: string;
  className: string;
  icon: typeof FiClock;
}> = {
  AVAILABLE: { label: "Available", className: "border-border bg-background text-foreground", icon: FiCheckCircle },
  PENDING: { label: "Pending", className: "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300", icon: FiClock },
  VERIFIED: { label: "Verified", className: "border-primary/35 bg-primary/10 text-primary", icon: FiCheckCircle },
  ONGOING: { label: "Ongoing", className: "border-energy bg-energy/15 text-foreground", icon: FiPlay },
  COMPLETED: { label: "Completed", className: "border-success/35 bg-success/10 text-success", icon: FiCheckCircle },
  CANCELLED: { label: "Cancelled", className: "border-destructive/30 bg-destructive/10 text-destructive", icon: FiXCircle },
  REJECTED: { label: "Rejected", className: "border-destructive/30 bg-destructive/10 text-destructive", icon: FiSlash },
  NO_SHOW: { label: "No-show", className: "border-destructive/30 bg-destructive/10 text-destructive", icon: FiUserX },
  CLOSED: { label: "Closed", className: "border-destructive/30 bg-destructive/10 text-destructive", icon: FiSlash },
  PAST: { label: "Past", className: "border-border/70 bg-muted/45 text-muted-foreground opacity-65", icon: FiClock },
};

const viewableStatuses: DashboardSlotStatus[] = ["PENDING", "VERIFIED", "ONGOING", "COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"];

function formatRange(start: string, end: string): string {
  return `${shortDate.format(parseDateOnly(start))} – ${shortDate.format(parseDateOnly(end))}`;
}

function WeekAvailability({
  selectedDate,
  today,
  days,
  onSelectDate,
  onChangeWeek,
}: {
  selectedDate: string;
  today: string;
  days: Array<{ date: string; available_slots: number; total_slots: number; is_closed: boolean; is_past: boolean }>;
  onSelectDate: (date: string) => void;
  onChangeWeek: (amount: number) => void;
}) {
  return (
    <Card aria-labelledby="dashboard-week-title">
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b">
        <CardTitle id="dashboard-week-title" className="text-sm font-bold sm:text-base">Week availability</CardTitle>
        <div className="flex items-center gap-1">
          <CalendarDatePicker iconOnly value={selectedDate} onChange={onSelectDate} />
          <Button type="button" variant="outline" size="icon-sm" aria-label="Previous week" onClick={() => onChangeWeek(-7)}><FiChevronLeft aria-hidden /></Button>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Next week" onClick={() => onChangeWeek(7)}><FiChevronRight aria-hidden /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid w-full min-w-0 grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const parsed = parseDateOnly(day.date);
            const selected = day.date === selectedDate;
            const disabled = day.is_closed;
            const suffix = day.is_closed ? "Closed" : day.is_past ? "Past" : `${day.available_slots} of ${day.total_slots} available`;

            return (
              <button
                key={day.date}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`${weekday.format(parsed)} ${parsed.getDate()}, ${suffix}`}
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  "relative min-w-0 min-h-20 rounded-lg border px-0.5 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:min-h-28 sm:rounded-xl sm:px-2 sm:py-3",
                  !disabled && !selected && "border-border bg-background hover:border-primary/45 hover:bg-muted/40",
                  selected && "border-primary bg-primary/10 ring-1 ring-primary/20",
                  day.is_past && !selected && "border-border/60 bg-muted/40 text-muted-foreground opacity-60",
                  day.is_closed && "cursor-not-allowed border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {day.date === today ? <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" aria-hidden /> : null}
                <span className="block text-[0.5rem] font-bold uppercase tracking-[.05em] text-muted-foreground sm:text-[0.65rem] sm:tracking-[.12em]">{weekday.format(parsed)}</span>
                <span className="mt-0.5 block font-heading text-lg font-extrabold sm:mt-1 sm:text-2xl">{parsed.getDate()}</span>
                <span className="mt-0.5 block text-[0.5rem] font-semibold leading-tight sm:hidden">{day.is_closed ? "Closed" : day.is_past ? "Past" : `${day.available_slots}/${day.total_slots}`}</span>
                <span className="mt-1 hidden text-xs font-semibold sm:block">{suffix}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TimeSlotCard({ slot, courtName, showCourtName = false, onView }: { slot: DashboardSlot; courtName: string; showCourtName?: boolean; onView: (id: number) => void }) {
  const presentation = slotPresentation[slot.status];
  const Icon = presentation.icon;
  const viewable = viewableStatuses.includes(slot.status) && slot.reservation_id !== null;
  const content = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background/60" aria-hidden><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1 text-left">
        {showCourtName ? <span className="mb-0.5 block text-[0.65rem] font-bold uppercase tracking-[.1em]">{courtName}</span> : null}
        <span className="block font-heading text-sm font-bold text-foreground">{formatHourRange(slot.start_hour, slot.end_hour)}</span>
        <span className="mt-0.5 block text-xs font-semibold">{presentation.label}{slot.reservation_reference ? ` · ${slot.reservation_reference}` : ""}</span>
      </span>
      {viewable ? <FiEye className="size-4 shrink-0" aria-hidden /> : null}
    </>
  );
  const className = cn(
    "flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-2.5",
    presentation.className,
    viewable && "cursor-pointer transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:brightness-110",
  );

  if (viewable) {
    return (
      <button type="button" className={className} aria-label={`View ${presentation.label.toLowerCase()} reservation ${slot.reservation_reference} for ${courtName}, ${formatHourRange(slot.start_hour, slot.end_hour)}`} onClick={() => onView(slot.reservation_id as number)}>
        {content}
      </button>
    );
  }

  return <button type="button" disabled className={cn(className, "cursor-not-allowed")} aria-label={`${courtName}, ${formatHourRange(slot.start_hour, slot.end_hour)}, ${presentation.label}`}>{content}</button>;
}

function CourtSchedule({ courts, onView }: { courts: Array<{ id: number; name: string; slots: DashboardSlot[] }>; onView: (id: number) => void }) {
  const timeRows = courts[0]?.slots ?? [];

  return (
    <div aria-label="Court schedule">
      <div className="hidden overflow-x-auto pb-1 md:block">
        <div className="grid min-w-full gap-3 md:grid-flow-col md:grid-cols-none md:auto-cols-[minmax(14rem,1fr)]">
          {courts.map((court) => (
            <section key={court.id} aria-labelledby={`dashboard-court-${court.id}`} className="min-w-0">
              <h3 id={`dashboard-court-${court.id}`} className="flex min-h-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 px-3 text-center font-heading font-bold text-primary">{court.name}</h3>
              <div className="mt-2 grid gap-2">
                {court.slots.map((slot) => <TimeSlotCard key={`${court.id}-${slot.start_hour}`} slot={slot} courtName={court.name} onView={onView} />)}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {timeRows.map((timeSlot) => (
          <article key={timeSlot.start_hour} className="rounded-xl border bg-background p-3">
            <h3 className="text-sm font-bold">{formatHourRange(timeSlot.start_hour, timeSlot.end_hour)}</h3>
            <div className="mt-3 grid gap-2">
              {courts.map((court) => {
                const slot = court.slots.find((candidate) => candidate.start_hour === timeSlot.start_hour);
                return slot ? <TimeSlotCard key={`${court.id}-${timeSlot.start_hour}`} slot={slot} courtName={court.name} showCourtName onView={onView} /> : null;
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function PortalHomeView() {
  const [today] = useState(todayInTimeZone);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => weekStartFor(today));
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const query = useDashboard(weekStart, selectedDate);
  const data = query.data;
  const weekEnd = data?.week.end ?? addDays(weekStart, 6);
  const description = `Weekly operation and records for ${formatRange(data?.week.start ?? weekStart, weekEnd)}.`;

  function selectDate(date: string) {
    setSelectedDate(date);
    setWeekStart(weekStartFor(date));
  }

  function changeWeek(amount: number) {
    const nextWeek = addDays(weekStart, amount);
    setWeekStart(nextWeek);
    setSelectedDate(nextWeek);
  }

  return (
    <div className="grid gap-5">
      <PageHeader title="Dashboard" description={description} />

      <section aria-label="Weekly dashboard KPIs" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <PortalMetricCard label="Pending" value={data?.kpis.pending} icon={FiClock} iconClassName="bg-energy/10 text-energy" />
        <PortalMetricCard label="Verified" value={data?.kpis.verified} icon={FiCalendar} iconClassName="bg-primary/10 text-primary" />
        <PortalMetricCard label="Completed" value={data?.kpis.completed} icon={FiCheckCircle} iconClassName="bg-success/10 text-success" />
        <PortalMetricCard label="Revenue" value={data ? currency.format(data.kpis.revenue) : undefined} icon={LuPhilippinePeso} iconClassName="bg-success/10 text-success" />
      </section>

      {query.isPending ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading dashboard availability…</CardContent></Card>
      ) : query.isError || !data ? (
        <Card><ErrorState title="Dashboard could not be loaded" description="Try loading the weekly dashboard again." onRetry={() => void query.refetch()} /></Card>
      ) : (
        <>
          <WeekAvailability selectedDate={selectedDate} today={today} days={data.days} onSelectDate={selectDate} onChangeWeek={changeWeek} />

          <Card aria-labelledby="dashboard-time-slots-title">
            <CardHeader className="border-b">
              <CardTitle id="dashboard-time-slots-title" className="text-lg font-bold">Time slots for {longDate.format(parseDateOnly(data.selected_date.date))}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.selected_date.courts.length === 0 ? (
                <EmptyState title="Court availability is not configured" description="Active courts and operating hours will appear here once configured." />
              ) : (
                <div className="grid gap-4">
                  {data.selected_date.is_closed ? <p role="status" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-medium">The entire operation is closed for this date.</p> : null}
                  <CourtSchedule courts={data.selected_date.courts} onView={setSelectedReservationId} />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ReservationDetailDialog reservation={null} reservationId={selectedReservationId} source="dashboard" open={selectedReservationId !== null} onOpenChange={(open) => { if (!open) setSelectedReservationId(null); }} />
    </div>
  );
}
