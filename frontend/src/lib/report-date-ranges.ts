import { parseDateOnly, toDateOnly } from "@/lib/date";

export const reportRangeOptions = [
  { value: "LAST_7_DAYS", label: "Last 7 Days" },
  { value: "LAST_30_DAYS", label: "Last 30 Days" },
  { value: "LAST_3_MONTHS", label: "Last 3 Months" },
  { value: "LAST_6_MONTHS", label: "Last 6 Months" },
  { value: "LAST_12_MONTHS", label: "Last 12 Months" },
  { value: "CUSTOM", label: "Custom Range" },
] as const;

export type ReportRangePreset = (typeof reportRangeOptions)[number]["value"];
export type AppliedReportRangePreset = Exclude<ReportRangePreset, "CUSTOM">;

export type ReportDateRange = { from: string; to: string };

function subtractMonthsNoOverflow(value: string, months: number): string {
  const date = parseDateOnly(value);
  const targetMonthStart = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastTargetDay = new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth() + 1, 0).getDate();
  targetMonthStart.setDate(Math.min(date.getDate(), lastTargetDay));
  return toDateOnly(targetMonthStart);
}

export function resolveReportPreset(preset: AppliedReportRangePreset, today: string): ReportDateRange {
  const date = parseDateOnly(today);
  if (preset === "LAST_7_DAYS" || preset === "LAST_30_DAYS") {
    date.setDate(date.getDate() - (preset === "LAST_7_DAYS" ? 6 : 29));
    return { from: toDateOnly(date), to: today };
  }

  const months = preset === "LAST_3_MONTHS" ? 3 : preset === "LAST_6_MONTHS" ? 6 : 12;
  return { from: subtractMonthsNoOverflow(today, months), to: today };
}

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function formatReportRange(range: ReportDateRange): string {
  const from = parseDateOnly(range.from);
  const to = parseDateOnly(range.to);
  return from.getFullYear() === to.getFullYear()
    ? `${shortDate.format(from)} – ${fullDate.format(to)}`
    : `${fullDate.format(from)} – ${fullDate.format(to)}`;
}
