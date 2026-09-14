import type { ReservationOptions } from "@/types/court-pricing";

/** Server-calculated hourly stock; only actual selected hours occupy equipment. */
export function equipmentForSchedule(options: ReservationOptions | undefined, hours: number[]) {
  const selectedHours = [...new Set(hours)];
  return (options?.equipment ?? []).map((item) => ({
    ...item,
    available_quantity: selectedHours.length === 0 ? 0 : Math.min(...selectedHours.map((hour) =>
      item.slot_availability?.find((slot) => slot.start_hour === hour)?.available_quantity ?? 0,
    )),
  }));
}
