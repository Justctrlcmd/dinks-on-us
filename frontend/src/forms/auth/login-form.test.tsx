import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const mutateAsync = vi.fn();
vi.mock("@/hooks/mutations/use-auth-mutations", () => ({ useLogin: () => ({ mutateAsync, isPending: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

afterEach(cleanup);

describe("LoginForm", () => {
  it("shows client validation before making a request", async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("only presents email and password credentials", () => {
    render(<LoginForm />);

    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /forgot password/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create an account/i })).not.toBeInTheDocument();
  });
});
