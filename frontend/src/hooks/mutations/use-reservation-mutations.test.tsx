import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { actionLogKeys, dashboardKeys, historyKeys, reportKeys, reservationKeys } from "@/config/query-keys";
import { NormalizedApiError } from "@/lib/api";
import type { ManagementReservation } from "@/types/reservation";

const reschedule = vi.hoisted(() => vi.fn());
vi.mock("@/services/reservations/reservation-service", () => ({ rescheduleReservation: reschedule }));
import { useRescheduleReservation } from "./use-reservation-mutations";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("keeps the successful current reservation despite a late read and waits for dashboard refresh", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const updated = { id: 8, reschedule_count: 2, slots: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], amounts: { final: 104, paid: 104 } } as ManagementReservation;
  const stale = { ...updated, reschedule_count: 1, slots: updated.slots!.slice(0, 2), amounts: { ...updated.amounts, final: 2, paid: 2 } };
  client.setQueryData(reservationKeys.detail(8), stale);
  let finishOldRead!: (data: ManagementReservation) => void;
  const oldRead = client.fetchQuery({ queryKey: reservationKeys.detail(8), queryFn: () => new Promise<ManagementReservation>((resolve) => { finishOldRead = resolve; }) }).catch(() => undefined);
  const dashboardKey = [...dashboardKeys.all, "refresh-test"];
  client.setQueryData(dashboardKey, { version: 1 });
  let finishDashboard!: (data: { version: number }) => void;
  const refresh = vi.fn(() => new Promise<{ version: number }>((resolve) => { finishDashboard = resolve; }));
  const observer = new QueryObserver(client, { queryKey: dashboardKey, queryFn: refresh, staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  reschedule.mockResolvedValue({ success: true, data: updated });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(useRescheduleReservation, { wrapper });
  let completed = false;
  let action!: Promise<unknown>;
  await act(async () => {
    action = result.current.mutateAsync({ id: 8, input: { slots: [] } }).then(() => { completed = true; });
  });
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(client.getQueryData(reservationKeys.detail(8))).toEqual(updated);
  expect(completed).toBe(false);
  finishOldRead(stale);
  await oldRead;
  expect(client.getQueryData(reservationKeys.detail(8))).toEqual(updated);
  await act(async () => { finishDashboard({ version: 2 }); await action; });
  expect(completed).toBe(true);
  expect(client.getQueryData(dashboardKey)).toEqual({ version: 2 });
  unsubscribe();
  client.clear();
});

 it("invalidates reports, history and action logs after reservation changes", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const keys = [historyKeys.all, reportKeys.all, actionLogKeys.all].map((key) => [...key, "audit-test"]);
  keys.forEach((key) => client.setQueryData(key, { version: 1 }));
  reschedule.mockResolvedValue({ success: true, data: { id: 8 } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(useRescheduleReservation, { wrapper });
  await act(async () => { await result.current.mutateAsync({ id: 8, input: { slots: [] } }); });
  keys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  client.clear();
});

it("refreshes the review after a server amount conflict without resubmitting", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = reservationKeys.detail(8);
  client.setQueryData(key, { id: 8, amounts: { paid: 2 } });
  reschedule.mockRejectedValue(new NormalizedApiError({ status: 409, code: "RESERVATION_REVIEW_CHANGED", message: "Review current amounts." }));
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(useRescheduleReservation, { wrapper });
  await act(async () => { await expect(result.current.mutateAsync({ id: 8, input: { slots: [] } })).rejects.toThrow("Review current amounts."); });
  expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  expect(reschedule).toHaveBeenCalledOnce();
  client.clear();
});

it("reuses an ambiguous request key after remount and rotates it after confirmation", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const input = { id: 19, input: { slots: [], expected_revision: 2 } };
  reschedule.mockRejectedValueOnce(new NormalizedApiError({ status: 0, code: "NETWORK_ERROR", message: "Response lost" }));
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const first = renderHook(useRescheduleReservation, { wrapper });
  await act(async () => { await expect(first.result.current.mutateAsync(input)).rejects.toThrow("Response lost"); });
  const key = reschedule.mock.calls[0][2];
  expect(key).toEqual(expect.any(String));
  first.unmount();
  reschedule.mockResolvedValue({ success: true, data: { id: 19 } });
  const second = renderHook(useRescheduleReservation, { wrapper });
  await act(async () => { await second.result.current.mutateAsync({ ...input, input: { ...input.input, expected_revision: 3 } }); });
  expect(reschedule.mock.calls[1][2]).toBe(key);
  await act(async () => { await second.result.current.mutateAsync(input); });
  expect(reschedule.mock.calls[2][2]).not.toBe(key);
  client.clear();
});

it("does not lose an ambiguous key when a subsequent retry is rate limited", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const input = { id: 29, input: { slots: [], expected_revision: 4 } };
  reschedule.mockRejectedValueOnce(new NormalizedApiError({ status: 0, code: "NETWORK_ERROR", message: "Response lost" }))
    .mockRejectedValueOnce(new NormalizedApiError({ status: 429, code: "RATE_LIMITED", message: "Wait briefly", retryAfterSeconds: 1 }))
    .mockResolvedValue({ success: true, data: { id: 29 } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(useRescheduleReservation, { wrapper });
  await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow("Response lost"); });
  await act(async () => { await expect(result.current.mutateAsync(input)).rejects.toThrow("Wait briefly"); });
  await act(async () => { await result.current.mutateAsync(input); });
  expect(reschedule.mock.calls[1][2]).toBe(reschedule.mock.calls[0][2]);
  expect(reschedule.mock.calls[2][2]).toBe(reschedule.mock.calls[0][2]);
  client.clear();
});
