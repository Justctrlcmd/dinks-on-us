import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NormalizedApiError } from "@/lib/api";
import { LoginView } from "./login-view";

const state = vi.hoisted(() => ({
  replace: vi.fn(),
  query: {
    data: undefined as { id: number } | undefined,
    error: null as Error | null,
    isPending: true,
    isFetching: true,
    refetch: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock("@/hooks/queries/use-current-user", () => ({ useCurrentUser: () => state.query }));
vi.mock("./auth-card-view", () => ({ AuthCardView: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/forms/auth/login-form", () => ({ LoginForm: () => <form aria-label="Login credentials" /> }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state.query, { data: undefined, error: null, isPending: true, isFetching: true });
});
afterEach(cleanup);

describe("LoginView session handling", () => {
  it("does not show credentials while checking the session", () => {
    render(<LoginView />);
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session...");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("rechecks cached account data before redirecting", () => {
    Object.assign(state.query, { data: { id: 1 }, isPending: false, isFetching: true });
    render(<LoginView />);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("replaces the login page with the portal for an authenticated session", async () => {
    Object.assign(state.query, { data: { id: 1 }, isPending: false, isFetching: false });
    render(<LoginView />);
    await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/portal"));
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it.each([
    { status: 401, code: "UNAUTHENTICATED" },
    { status: 403, code: "ACCOUNT_INACTIVE" },
  ])("shows credentials after the server rejects the session with $code", ({ status, code }) => {
    Object.assign(state.query, {
      isPending: false, isFetching: false,
      error: new NormalizedApiError({ status, code, message: "Sign in again." }),
    });
    render(<LoginView />);
    expect(screen.getByRole("form", { name: "Login credentials" })).toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("shows a retry when the session check fails instead of treating it as a guest", () => {
    Object.assign(state.query, {
      data: { id: 1 }, isPending: false, isFetching: false,
      error: new NormalizedApiError({ status: 500, code: "SERVER_ERROR", message: "Request failed." }),
    });
    render(<LoginView />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't check your session.");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(state.query.refetch).toHaveBeenCalledOnce();
    expect(state.replace).not.toHaveBeenCalled();
  });
});
