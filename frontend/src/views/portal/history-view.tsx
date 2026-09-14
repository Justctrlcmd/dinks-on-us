"use client";

import { useEffect, useState } from "react";
import { FiCheckCircle, FiEye, FiSearch, FiSlash, FiUserX, FiXCircle } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import { ReservationStatusBadge } from "@/components/portal/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReservationDetailDialog } from "@/forms/reservations/reservation-dialogs";
import { useHistory } from "@/hooks/queries/use-history";
import { formatDateOnly } from "@/lib/date";
import type { FinalReservationStatus, HistoryFilters, ManagementReservation, ReservationSource } from "@/types/reservation";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const statusFilters: Array<{ value: FinalReservationStatus; label: string }> = [
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NO_SHOW", label: "No-show" },
];

const sourceFilters: Array<{ value: ReservationSource; label: string }> = [
  { value: "ONLINE", label: "Online" },
  { value: "WALK_IN", label: "Walk-in" },
];

function ViewAction({ reservation, onView }: { reservation: ManagementReservation; onView: (reservation: ManagementReservation) => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={() => onView(reservation)} aria-label={`View ${reservation.reference_number}`}>
      <FiEye aria-hidden />
      View
    </Button>
  );
}

export function HistoryView() {
  const [filters, setFilters] = useState<HistoryFilters>({ page: 1, search: "", status: "", source: "" });
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<ManagementReservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => current.search === searchInput ? current : { ...current, page: 1, search: searchInput });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const query = useHistory(filters);
  const reservations = query.data?.data.reservations ?? [];
  const kpis = query.data?.data.kpis;
  const meta = query.data?.meta;

  function viewReservation(reservation: ManagementReservation) {
    setSelected(reservation);
    setDetailOpen(true);
  }

  return (
    <div className="grid gap-5">
      <PageHeader title="History" description="Review finalized reservation records and their preserved operational details." />

      <section aria-label="History KPIs" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <PortalMetricCard label="Completed" value={kpis?.completed} icon={FiCheckCircle} iconClassName="bg-success/10 text-success" />
        <PortalMetricCard label="Cancelled" value={kpis?.cancelled} icon={FiXCircle} iconClassName="bg-destructive/10 text-destructive" />
        <PortalMetricCard label="Rejected" value={kpis?.rejected} icon={FiSlash} iconClassName="bg-destructive/10 text-destructive" />
        <PortalMetricCard label="No-show" value={kpis?.no_show} icon={FiUserX} iconClassName="bg-destructive/10 text-destructive" />
      </section>

      <Card size="sm" className="p-4">
        <div role="search" aria-label="Filter reservation history" className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(260px,1fr)_220px_220px]">
          <label className="relative col-span-2 block xl:col-span-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              aria-label="Search reservation history"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Reference, customer, court, contact, or payment reference"
              className="h-10 pl-9"
            />
          </label>
          <SelectWithLabel
            id="history-status"
            ariaLabel="Filter history by final status"
            className="min-w-0"
            value={filters.status || "ALL"}
            options={[{ value: "ALL", label: "All final statuses" }, ...statusFilters]}
            onValueChange={(value) => value && setFilters((current) => ({ ...current, page: 1, status: value === "ALL" ? "" : value as FinalReservationStatus }))}
          />
          <SelectWithLabel
            id="history-source"
            ariaLabel="Filter history by reservation source"
            className="min-w-0"
            value={filters.source || "ALL"}
            options={[{ value: "ALL", label: "All sources" }, ...sourceFilters]}
            onValueChange={(value) => value && setFilters((current) => ({ ...current, page: 1, source: value === "ALL" ? "" : value as ReservationSource }))}
          />
        </div>
      </Card>

      <Card className="gap-0 py-0">
        {query.isPending ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading reservation history…</p>
        ) : query.isError ? (
          <ErrorState title="History could not be loaded" description="Try loading the finalized reservation list again." onRetry={() => void query.refetch()} />
        ) : reservations.length === 0 ? (
          <EmptyState title="No matching history records" description="Completed, cancelled, rejected, and no-show reservations will appear here." />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <caption className="sr-only">Finalized reservation history</caption>
                <thead className="border-b bg-muted/45 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">Reference ID</th>
                    <th scope="col" className="px-4 py-3">Customer Name</th>
                    <th scope="col" className="px-4 py-3">Contact Number</th>
                    <th scope="col" className="px-4 py-3">Booking Date</th>
                    <th scope="col" className="px-4 py-3">Source</th>
                    <th scope="col" className="px-4 py-3">Total</th>
                    <th scope="col" className="w-36 px-4 py-3 text-center">Final Status</th>
                    <th scope="col" className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-bold text-primary">{reservation.reference_number}</td>
                      <td className="px-4 py-3 font-medium">{reservation.customer.name}</td>
                      <td className="px-4 py-3">{reservation.customer.contact_number}</td>
                      <td className="px-4 py-3">{formatDateOnly(reservation.booking_date)}</td>
                      <td className="px-4 py-3 capitalize">{reservation.source.toLowerCase().replaceAll("_", "-")}</td>
                      <td className="px-4 py-3 font-bold">{currency.format(reservation.amounts.final)}</td>
                      <td className="w-36 px-4 py-3 text-center align-middle"><ReservationStatusBadge status={reservation.display_status} /></td>
                      <td className="px-4 py-3 text-center"><ViewAction reservation={reservation} onView={viewReservation} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 md:hidden">
              {reservations.map((reservation) => (
                <article key={reservation.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-xl border p-4">
                  <div className="min-w-0">
                    <p className="font-heading font-extrabold text-primary">{reservation.reference_number}</p>
                    <h3 className="mt-1 font-semibold">{reservation.customer.name}</h3>
                    <p className="text-sm text-muted-foreground">{reservation.customer.contact_number}</p>
                  </div>
                  <div className="row-span-2 flex min-h-full flex-col items-end justify-between gap-8">
                    <ViewAction reservation={reservation} onView={viewReservation} />
                    <ReservationStatusBadge status={reservation.display_status} />
                  </div>
                  <dl className="mt-4 grid min-w-0 gap-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Booking date</dt><dd className="font-medium">{formatDateOnly(reservation.booking_date)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Source</dt><dd className="font-medium capitalize">{reservation.source.toLowerCase().replaceAll("_", "-")}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-bold">{currency.format(reservation.amounts.final)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>

            {meta && meta.last_page > 1 ? (
              <div className="border-t p-3"><Pagination page={meta.current_page} lastPage={meta.last_page} onChange={(page) => setFilters((current) => ({ ...current, page }))} /></div>
            ) : null}
          </>
        )}
      </Card>

      <ReservationDetailDialog
        source="history"
        reservation={selected}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
