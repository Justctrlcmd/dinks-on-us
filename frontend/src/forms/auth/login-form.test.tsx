import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const mutateAsync = vi.fn();
vi.mock("@/hooks/mutations/use-auth-mutations", () => ({ useLogin: () => ({ mutateAsync, isPending: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

describe("LoginForm", () => {
  it("shows client validation before making a request", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
