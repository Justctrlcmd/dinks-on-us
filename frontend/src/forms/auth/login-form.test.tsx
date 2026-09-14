import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const mutateAsync = vi.fn();
const replace = vi.fn();
vi.mock("@/hooks/mutations/use-auth-mutations", () => ({ useLogin: () => ({ mutateAsync, isPending: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

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

  it("opens the portal after a successful login", async () => {
    mutateAsync.mockResolvedValueOnce({ data: { id: 1 } });
    render(<LoginForm />);

    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), { target: { value: "manager@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/portal"));
  });
});
