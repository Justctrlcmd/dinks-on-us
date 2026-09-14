import { describe, expect, it } from "vitest";
import { equipmentForSchedule } from "./equipment-availability";
import type { ReservationOptions } from "@/types/court-pricing";

const options = { equipment: [{ id: 1, available_quantity: 20, slot_availability: [
  { start_hour: 10, available_quantity: 15 },
  { start_hour: 11, available_quantity: 0 },
  { start_hour: 12, available_quantity: 7 },
] }] } as ReservationOptions;

describe("schedule equipment limits", () => {
  it("uses the lowest selected hourly availability, ignoring gaps and duplicate courts", () => {
    expect(equipmentForSchedule(options, [10, 12, 10])[0].available_quantity).toBe(7);
    expect(equipmentForSchedule(options, [10, 11, 12])[0].available_quantity).toBe(0);
  });
  it("disables equipment without a complete schedule or server availability", () => {
    expect(equipmentForSchedule(options, [9])[0].available_quantity).toBe(0);
    expect(equipmentForSchedule(options, [])[0].available_quantity).toBe(0);
    expect(equipmentForSchedule(undefined, [10])).toEqual([]);
  });
});
