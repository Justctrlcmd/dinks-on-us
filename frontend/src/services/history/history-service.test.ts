import { beforeEach, describe, expect, it, vi } from "vitest";

const authFetch = vi.fn();

vi.mock("@/lib/api", () => ({ authFetch }));

describe("history service", () => {
  beforeEach(() => authFetch.mockReset());

  it("sends pagination, search, final status, and source filters", async () => {
    const { getHistory } = await import("./history-service");
    const signal = new AbortController().signal;

    getHistory({ page: 2, search: " RF-101 ", status: "COMPLETED", source: "ONLINE" }, signal);

    expect(authFetch).toHaveBeenCalledWith(
      "/api/v1/management/history?page=2&per_page=10&search=RF-101&status=COMPLETED&source=ONLINE",
      { signal },
    );
  });

  it("uses the read-only history detail endpoint", async () => {
    const { getHistoryReservation } = await import("./history-service");

    getHistoryReservation(42);

    expect(authFetch).toHaveBeenCalledWith("/api/v1/management/history/42", { signal: undefined });
  });
});
