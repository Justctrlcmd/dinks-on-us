import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthBoundary } from "./auth-boundary";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/hooks/queries/use-current-user", () => ({ useCurrentUser: () => ({ isPending: true, error: null }) }));

describe("AuthBoundary", () => { it("keeps portal content private while authentication loads", () => { render(<AuthBoundary><div>Private</div></AuthBoundary>); expect(screen.getByRole("status")).toHaveTextContent("Loading your account..."); expect(screen.queryByText("Private")).not.toBeInTheDocument(); }); });
