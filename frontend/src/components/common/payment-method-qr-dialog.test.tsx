import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PaymentMethodQrDialog } from "./payment-method-qr-dialog";

describe("PaymentMethodQrDialog", () => {
  it("opens the selected checkout method QR from a text link", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodQrDialog method={{ id: 7, name: "GCash", account_name: "Dinks on Us", account_number: "09123456789", qr_image_url: "/gcash.png" }} />);

    await user.click(screen.getByRole("button", { name: "Show QR for this e-wallet" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GCash QR code" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "GCash payment QR code" })).toHaveAttribute("src", "/gcash.png");
  });
});
