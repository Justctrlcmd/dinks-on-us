export function formatHour(hour: number): string {
  const normalized = hour % 24;
  const period = normalized < 12 ? "AM" : "PM";
  const displayHour = normalized % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

export function formatHourRange(startHour: number, endHour: number): string {
  return `${formatHour(startHour)} – ${formatHour(endHour)}`;
}
