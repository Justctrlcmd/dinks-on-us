import { formatDateOnly, formatShortDateOnly } from "@/lib/date";
import { formatCompactHourRange } from "@/lib/time";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function ReservationSlotLabel({ courtName, date, startHour, endHour, prefix }: { courtName: string | null; date?: string; startHour: number; endHour: number; prefix?: string }) {
  return <>
    {prefix ? <>{prefix}{" · "}</> : null}
    <span className="whitespace-nowrap">{courtName}</span>
    {date ? <>{" · "}<span className="whitespace-nowrap" title={formatDateOnly(date)}>{formatShortDateOnly(date)}</span></> : null}
    {" · "}<span className="whitespace-nowrap">{formatCompactHourRange(startHour, endHour)}</span>
  </>;
}

export function ReservationSummaryLine({ label, amount, labelClassName, amountClassName, className }: { label: React.ReactNode; amount: number; labelClassName?: string; amountClassName?: string; className?: string }) {
  return <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 py-2.5 text-sm", className)}>
    <span className={cn("min-w-0 leading-6", labelClassName)}>{label}</span>
    <strong className={cn("shrink-0 whitespace-nowrap text-right font-heading font-bold tabular-nums", amountClassName)}>{currency.format(amount)}</strong>
  </div>;
}
