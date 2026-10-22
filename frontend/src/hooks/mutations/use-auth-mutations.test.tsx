import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLogin, useLogout } from "./use-auth-mutations";

vi.mock("@/services/auth/auth-service", () => ({
  login: vi.fn().mockResolvedValue({ success: true, data: { id: 2 } }),
  logout: vi.fn().mockResolvedValue({ success: true, data: null }),
  resendVerification: vi.fn(),
}));

function setup() {
  const client = new QueryClient();
  client.setQueryData(["auth", "current-user"], { id: 1 });
  client.setQueryData(["reservations", "detail", 1], { private: true });
  client.setQueryData(["reports"], { private: true });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe("authentication cache changes", () => {
  it("clears all account data on logout", async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(useLogout, { wrapper });
    await act(() => result.current.mutateAsync());
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("starts a login with only the new account cached", async () => {
    const { client, wrapper } = setup();
    const { result } = renderHook(useLogin, { wrapper });
    await act(() => result.current.mutateAsync({ email: "test@example.com", password: "password123" }));
    expect(client.getQueryData(["auth", "current-user"])).toEqual({ id: 2 });
    expect(client.getQueryCache().getAll()).toHaveLength(1);
  });
});
