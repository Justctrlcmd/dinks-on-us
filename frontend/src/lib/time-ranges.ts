export type TimeRange = { start_hour: number; end_hour: number };

export function changeTimeRangeEnd<T extends TimeRange>(ranges: T[], index: number, endHour: number): T[] {
  const next = ranges.slice(0, index + 1).map((range) => ({ ...range }));
  next[index].end_hour = endHour;
  return next;
}

export function changeTimeRangeStart<T extends TimeRange>(ranges: T[], index: number, startHour: number): T[] {
  const next = ranges.slice(0, index + 1).map((range) => ({ ...range }));
  next[index].start_hour = startHour;
  next[index].end_hour = Math.max(startHour + 1, next[index].end_hour);
  return next;
}

export function canAddTimeRange(ranges: TimeRange[], closingHour: number): boolean {
  const last = ranges.at(-1);
  return Boolean(last && last.end_hour < closingHour);
}

export function addTimeRange<T extends TimeRange>(ranges: T[], closingHour: number, create: (startHour: number, endHour: number, previous: T) => T): T[] {
  const last = ranges.at(-1);
  if (!last || last.end_hour >= closingHour) return ranges;
  return [...ranges, create(last.end_hour, closingHour, last)];
}

export function removeLastTimeRange<T extends TimeRange>(ranges: T[], closingHour: number): T[] {
  if (ranges.length <= 1) return ranges;
  const next = ranges.slice(0, -1).map((range) => ({ ...range }));
  next[next.length - 1].end_hour = closingHour;
  return next;
}
