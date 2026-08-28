import { cn } from "@/lib/utils";

export function PendingReservationBadge({ count, icon = false, className }: { count?: number; icon?: boolean; className?: string }) {
  if (!count || count < 1) return null;

  const displayCount = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[.65rem] font-extrabold leading-none text-white",
        icon && "absolute -right-1 -top-1 z-10 size-5 min-w-0 border-2 border-sidebar p-0",
        className,
      )}
    >
      {displayCount}
    </span>
  );
}
