"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiEye,
  FiMoreHorizontal,
  FiPlus,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiSlash,
  FiXCircle,
} from "react-icons/fi";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { PortalMetricCard } from "@/components/portal/portal-metric-card";
import { ReservationStatusBadge } from "@/components/portal/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  AddOnsDialog,
  CancelReservationDialog,
  CompleteReservationDialog,
  RejectReservationDialog,
  ReservationDetailDialog,
  RescheduleReservationDialog,
} from "@/forms/reservations/reservation-dialogs";
import {
  useNoShowReservation,
  useStartReservation,
  useVerifyReservation,
} from "@/hooks/mutations/use-reservation-mutations";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { useReservations } from "@/hooks/queries/use-reservations";
import { formatDateOnly } from "@/lib/date";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type {
  ManagementReservation,
  ReservationFilters,
  ReservationStatus,
} from "@/types/reservation";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const statusFilters: Array<{ value: ReservationStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "ONGOING", label: "Ongoing" },
];

type DialogKind =
  | "view"
  | "reject"
  | "reschedule"
  | "addons"
  | "complete"
  | "cancel"
  | null;
type ConfirmAction = "verify" | "start" | "no-show" | null;

function ReservationActions({
  reservation,
  isManager,
  disabled,
  onDialog,
  onConfirm,
}: {
  reservation: ManagementReservation;
  isManager: boolean;
  disabled: boolean;
  onDialog: (kind: DialogKind, reservation: ManagementReservation) => void;
  onConfirm: (
    action: ConfirmAction,
    reservation: ManagementReservation,
  ) => void;
}) {
  const verified = reservation.status === "VERIFIED";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${reservation.reference_number}`}
            disabled={disabled}
          />
        }
      >
        <FiMoreHorizontal aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => onDialog("view", reservation)}>
          <FiEye aria-hidden />
          View
        </DropdownMenuItem>
        {reservation.status === "PENDING" ? (
          <>
            <DropdownMenuItem disabled={disabled} onClick={() => onConfirm("verify", reservation)}>
              <FiCheckCircle aria-hidden />
              Verify
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={disabled}
              onClick={() => onDialog("reject", reservation)}
            >
              <FiXCircle aria-hidden />
              Reject
            </DropdownMenuItem>
          </>
        ) : null}
        {verified ? (
          <>
            <DropdownMenuItem disabled={disabled} onClick={() => onConfirm("start", reservation)}>
              <FiPlay aria-hidden />
              Mark ongoing
            </DropdownMenuItem>
            <DropdownMenuItem disabled={disabled} onClick={() => onDialog("addons", reservation)}>
              <FiRefreshCw aria-hidden />
              Add-ons
            </DropdownMenuItem>
            {isManager ? (
              <>
                <DropdownMenuItem
                  disabled={disabled}
                  onClick={() => onDialog("reschedule", reservation)}
                >
                  <FiRefreshCw aria-hidden />
                  Reschedule
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={disabled}
                  onClick={() => onDialog("cancel", reservation)}
                >
                  <FiXCircle aria-hidden />
                  Cancel
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              disabled={disabled}
              onClick={() => onConfirm("no-show", reservation)}
            >
              <FiSlash aria-hidden />
              No-show
            </DropdownMenuItem>
          </>
        ) : null}
        {reservation.status === "ONGOING" ? (
          <>
            <DropdownMenuItem disabled={disabled} onClick={() => onDialog("complete", reservation)}>
              <FiCheckCircle aria-hidden />
              Complete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReservationsView() {
  const [filters, setFilters] = useState<ReservationFilters>({
    page: 1,
    search: "",
    status: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<ManagementReservation | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput
          ? current
          : { ...current, page: 1, search: searchInput },
      );
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);
  const query = useReservations(filters);
  const currentUser = useCurrentUser();
  const verifyMutation = useVerifyReservation();
  const startMutation = useStartReservation();
  const noShowMutation = useNoShowReservation();
  const reservations = query.data?.data.reservations ?? [];
  const kpis = query.data?.data.kpis;
  const meta = query.data?.meta;
  const isManager = currentUser.data?.role?.is_full_access === true;
  const actionPending = verifyMutation.isPending || startMutation.isPending || noShowMutation.isPending;
  const confirmPending =
    confirmAction === "verify"
      ? verifyMutation.isPending
      : confirmAction === "start"
        ? startMutation.isPending
        : confirmAction === "no-show"
          ? noShowMutation.isPending
          : false;
  const confirmMutation =
    confirmAction === "verify"
      ? verifyMutation
      : confirmAction === "start"
        ? startMutation
        : confirmAction === "no-show"
          ? noShowMutation
          : null;
  const confirmRateLimited = confirmMutation ? isMutationRateLimited(confirmMutation) : false;

  function openDialog(kind: DialogKind, reservation: ManagementReservation) {
    if (actionPending) return;
    setSelected(reservation);
    setDialog(kind);
  }
  function openConfirm(
    action: ConfirmAction,
    reservation: ManagementReservation,
  ) {
    if (actionPending) return;
    setSelected(reservation);
    setConfirmAction(action);
  }
  function confirm() {
    if (!selected || !confirmAction || actionPending) return;
    const mutation =
      confirmAction === "verify"
        ? verifyMutation
        : confirmAction === "start"
          ? startMutation
          : noShowMutation;
    mutation.mutate(selected.id, { onSuccess: () => setConfirmAction(null) });
  }
  const confirmCopy =
    confirmAction === "verify"
      ? [
          "Verify this reservation?",
          "This accepts the submitted payment and confirms the booking.",
          "Yes, verify",
        ]
      : confirmAction === "start"
        ? [
            "Mark this reservation ongoing?",
            "Confirm that the customer is at the facility and has started playing.",
            "Yes, mark ongoing",
          ]
        : [
            "Mark this reservation as no-show?",
            "This finalizes the reservation. Collected payment remains non-refundable revenue.",
            "Yes, mark no-show",
          ];

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Reservations"
        description="Review payment submissions and manage verified or ongoing court visits."
        actionsClassName="absolute right-0 top-0"
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/portal/reservations/walk-in" />}
            className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
          >
            <FiPlus aria-hidden="true" />
            Add Walk-in
          </Button>
        }
      />
      <section
        aria-label="Reservation KPIs"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <PortalMetricCard
          label="Pending"
          value={kpis?.pending}
          icon={FiClock}
          iconClassName="bg-primary/10 text-primary"
        />
        <PortalMetricCard
          label="Ongoing"
          value={kpis?.ongoing}
          icon={FiPlay}
          iconClassName="bg-energy/10 text-energy"
        />
        <PortalMetricCard
          label="Verified"
          value={kpis?.verified}
          icon={FiCheckCircle}
          iconClassName="bg-success/10 text-success"
        />
        <PortalMetricCard
          label="Rescheduled"
          value={kpis?.rescheduled}
          icon={FiRefreshCw}
          iconClassName="bg-primary/10 text-primary"
        />
      </section>
      <Card size="sm" className="p-4">
        <div
          role="search"
          aria-label="Filter reservations"
          className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px]"
        >
          <label className="relative block">
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              aria-label="Search reservations"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Reference, customer, contact, or payment reference"
              className="h-10 pl-9"
            />
          </label>
          <SelectWithLabel
            id="reservation-status"
            ariaLabel="Filter reservations by status"
            value={filters.status || "ALL"}
            options={[{ value: "ALL", label: "All statuses" }, ...statusFilters]}
            onValueChange={(value) => {
              if (value) {
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  status:
                    value === "ALL"
                      ? ""
                      : (value as ReservationFilters["status"]),
                }));
              }
            }}
          />
        </div>
      </Card>
      <Card className="gap-0 py-0">
        {query.isPending ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading reservation requests…
          </p>
        ) : query.isError ? (
          <ErrorState
            title="Reservations could not be loaded"
            description="Try loading the reservation list again."
            onRetry={() => void query.refetch()}
          />
        ) : reservations.length === 0 ? (
          <EmptyState
            title="No matching reservations"
            description="New customer requests and active reservations will appear here."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Reservation requests and current status
                </caption>
                <thead className="border-b bg-muted/45 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Reference ID
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Customer Name
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Contact Number
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Booking Date
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Source
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Total
                    </th>
                    <th scope="col" className="w-36 px-4 py-3 text-center">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-bold text-primary">
                        {reservation.reference_number}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {reservation.customer.name}
                      </td>
                      <td className="px-4 py-3">
                        {reservation.customer.contact_number}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateOnly(reservation.booking_date)}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {reservation.source.toLowerCase().replaceAll("_", "-")}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {currency.format(reservation.amounts.final)}
                      </td>
                      <td className="w-36 px-4 py-3 text-center align-middle">
                        <ReservationStatusBadge status={reservation.display_status} />
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <ReservationActions
                          reservation={reservation}
                          isManager={isManager}
                          disabled={actionPending}
                          onDialog={openDialog}
                          onConfirm={openConfirm}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {reservations.map((reservation) => (
                <article
                  key={reservation.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 rounded-xl border p-4"
                >
                  <div className="min-w-0">
                    <p className="font-heading font-extrabold text-primary">
                      {reservation.reference_number}
                    </p>
                    <h3 className="mt-1 font-semibold">
                      {reservation.customer.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {reservation.customer.contact_number}
                    </p>
                  </div>
                  <div className="row-span-2 flex min-h-full flex-col items-end justify-between gap-8">
                    <ReservationActions
                      reservation={reservation}
                      isManager={isManager}
                      disabled={actionPending}
                      onDialog={openDialog}
                      onConfirm={openConfirm}
                    />
                    <ReservationStatusBadge status={reservation.display_status} />
                  </div>
                  <dl className="mt-4 grid min-w-0 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Booking date
                      </dt>
                      <dd className="font-medium">
                        {formatDateOnly(reservation.booking_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Source</dt>
                      <dd className="font-medium capitalize">{reservation.source.toLowerCase().replaceAll("_", "-")}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Total</dt>
                      <dd className="font-bold">
                        {currency.format(reservation.amounts.final)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            {meta && meta.last_page > 1 ? (
              <div className="border-t p-3">
                <Pagination
                  page={meta.current_page}
                  lastPage={meta.last_page}
                  onChange={(page) =>
                    setFilters((current) => ({ ...current, page }))
                  }
                />
              </div>
            ) : null}
          </>
        )}
      </Card>
      <ReservationDetailDialog
        reservation={selected}
        open={dialog === "view"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <RejectReservationDialog
        key={`reject-${selected?.id ?? "none"}-${dialog === "reject"}`}
        reservation={selected}
        open={dialog === "reject"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <RescheduleReservationDialog
        key={`reschedule-${selected?.id ?? "none"}-${dialog === "reschedule"}`}
        reservation={selected}
        open={dialog === "reschedule"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <AddOnsDialog
        key={`addons-${selected?.id ?? "none"}-${dialog === "addons"}`}
        reservation={selected}
        open={dialog === "addons"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <CompleteReservationDialog
        key={`complete-${selected?.id ?? "none"}-${dialog === "complete"}`}
        reservation={selected}
        open={dialog === "complete"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <CancelReservationDialog
        key={`cancel-${selected?.id ?? "none"}-${dialog === "cancel"}`}
        reservation={selected}
        open={dialog === "cancel"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && !confirmPending && setConfirmAction(null)}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{confirmCopy[0]}</DialogTitle>
            <DialogDescription>{confirmCopy[1]}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={confirmPending}>Not yet</Button>} />
            <Button
              variant={confirmAction === "no-show" ? "destructive" : "default"}
              disabled={confirmPending || confirmRateLimited}
              onClick={confirm}
            >
              {confirmAction === "verify"
                ? mutationButtonLabel("Verifying…", confirmCopy[2], verifyMutation)
                : confirmAction === "start"
                  ? mutationButtonLabel("Marking ongoing…", confirmCopy[2], startMutation)
                  : mutationButtonLabel("Marking no-show…", confirmCopy[2], noShowMutation)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
