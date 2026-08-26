import { describe, expect, it } from "vitest";
import { addTimeRange, canAddTimeRange, changeTimeRangeEnd, changeTimeRangeStart, removeLastTimeRange } from "@/lib/time-ranges";

describe("sequential time ranges", () => {
  it("starts as a full operating range and unlocks a consecutive range after an earlier ending is selected", () => {
    const initial = [{ start_hour: 7, end_hour: 24 }];
    expect(canAddTimeRange(initial, 24)).toBe(false);

    const shortened = changeTimeRangeEnd(initial, 0, 17);
    expect(canAddTimeRange(shortened, 24)).toBe(true);
    expect(addTimeRange(shortened, 24, (start_hour, end_hour) => ({ start_hour, end_hour }))).toEqual([
      { start_hour: 7, end_hour: 17 },
      { start_hour: 17, end_hour: 24 },
    ]);
  });

  it("drops later ranges when an earlier ending changes and extends the previous range when the last is removed", () => {
    const ranges = [
      { start_hour: 7, end_hour: 12 },
      { start_hour: 12, end_hour: 17 },
      { start_hour: 17, end_hour: 24 },
    ];

    expect(changeTimeRangeEnd(ranges, 0, 10)).toEqual([{ start_hour: 7, end_hour: 10 }]);
    expect(removeLastTimeRange(ranges, 24)).toEqual([
      { start_hour: 7, end_hour: 12 },
      { start_hour: 12, end_hour: 24 },
    ]);
    expect(changeTimeRangeStart(ranges, 1, 14)).toEqual([
      { start_hour: 7, end_hour: 12 },
      { start_hour: 14, end_hour: 17 },
    ]);
  });
});
