import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startRateLimitCooldown, useRateLimitCooldown } from "@/lib/rate-limit-cooldown";

describe("rate-limit cooldown", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it("uses the server retry duration and counts down to an enabled state", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRateLimitCooldown("test-submit"));

    act(() => startRateLimitCooldown("test-submit", 3));
    expect(result.current).toMatchObject({ isCoolingDown: true, remainingSeconds: 3, label: "Try again in 0:03" });

    act(() => vi.advanceTimersByTime(3_000));
    expect(result.current).toMatchObject({ isCoolingDown: false, remainingSeconds: 0, label: "" });
  });
});
