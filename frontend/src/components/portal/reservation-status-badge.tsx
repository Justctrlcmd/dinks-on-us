import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@/types/reservation";

const statusStyles: Record<ReservationStatus, string> = {
  PENDING:
    "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  VERIFIED: "border-primary/35 bg-primary/10 text-primary",
  RESCHEDULED: "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  ONGOING: "border-energy/40 bg-energy/10 text-energy",
  COMPLETED: "border-primary/35 bg-primary/10 text-primary",
  REJECTED: "border-destructive/35 bg-destructive/10 text-destructive",
  CANCELLED: "border-destructive/35 bg-destructive/10 text-destructive",
  NO_SHOW: "border-destructive/35 bg-destructive/10 text-destructive",
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-32 items-center justify-center rounded-full border px-2.5 py-1 text-center text-xs font-bold capitalize",
        statusStyles[status],
      )}
    >
      {status.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}
