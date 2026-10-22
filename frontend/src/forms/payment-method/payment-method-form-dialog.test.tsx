import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { create, update } = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("@/hooks/mutations/use-payment-method-mutations", () => ({
  useCreatePaymentMethod: () => ({ mutateAsync: create, isPending: false }),
  useUpdatePaymentMethod: () => ({ mutateAsync: update, isPending: false }),
}));

import { PaymentMethodFormDialog } from "./payment-method-form-dialog";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("payment account input", () => {
  it("keeps letters and punctuation out when typing or pasting in the create form", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodFormDialog paymentMethod={null} open onOpenChange={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Account number" });
    await user.type(input, "00ab12e3.4");
    expect(input).toHaveValue("001234");
    await user.clear(input);
    await user.paste("00-123 abc 45");
    expect(input).toHaveValue("0012345");
    expect(create).not.toHaveBeenCalled();
  });

  it("submits the filtered number as text with leading zeros on edit", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodFormDialog paymentMethod={{
      id: 1, name: "Bank", account_name: "Dinks on Us", account_number: "0099",
      qr_image_url: "/qr.webp", is_active: true, created_at: "", updated_at: "",
    }} open onOpenChange={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Account number" });
    await user.clear(input);
    await user.type(input, "00ab123");
    expect(input).toHaveValue("00123");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect({
      calls: update.mock.calls,
      errors: screen.queryAllByRole("alert").map((element) => element.textContent),
    }).toEqual({
      calls: [[{ id: 1, input: { name: "Bank", account_name: "Dinks on Us", account_number: "00123", qr_image: undefined } }]],
      errors: [],
    }));
  });
});
