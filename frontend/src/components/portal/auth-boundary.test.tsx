import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthBoundary } from "./auth-boundary";

const state = vi.hoisted(() => ({ replace: vi.fn(), isPending: true }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock("@/hooks/queries/use-current-user", () => ({ useCurrentUser: () => ({ isPending: state.isPending, error: null }) }));

describe("AuthBoundary", () => {
  beforeEach(() => { state.isPending = true; state.replace.mockClear(); });

  it("keeps portal content private while authentication loads", () => {
    render(<AuthBoundary><div>Private</div></AuthBoundary>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your account...");
    expect(screen.queryByText("Private")).not.toBeInTheDocument();
  });

  it("hides an already rendered portal when another API request reports session expiry", () => {
    state.isPending = false;
    render(<AuthBoundary><div>Private</div></AuthBoundary>);
    expect(screen.getByText("Private")).toBeInTheDocument();
    act(() => window.dispatchEvent(new CustomEvent("auth:unauthorized")));
    expect(screen.queryByText("Private")).not.toBeInTheDocument();
    expect(state.replace).toHaveBeenCalledWith("/login?expired=1");
  });
});
