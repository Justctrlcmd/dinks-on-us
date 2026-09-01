import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationCheckout } from "@/components/public/reservation/reservation-checkout";
import { RESERVATION_DRAFT_STORAGE_KEY } from "@/types/reservation";

const { submitReservationMock, toastErrorMock } = vi.hoisted(() => ({ submitReservationMock: vi.fn(), toastErrorMock: vi.fn() }));

vi.mock("@/components/common/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: toastErrorMock, warning: vi.fn(), info: vi.fn() }),
}));

vi.mock("@/hooks/queries/use-policies", () => ({
  usePublicPolicies: () => ({
    data: [{
      id: 2,
      slug: "court-rules",
      name: "Court Rules & Policy",
      sort_order: 1,
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z",
      subheaders: [{
        id: 20,
        policy_section_id: 2,
        title: "Court Use",
        sort_order: 1,
        created_at: "2026-08-25T00:00:00.000Z",
        updated_at: "2026-08-25T00:00:00.000Z",
        rules: [{
          id: 200,
          policy_subheader_id: 20,
          content: "Use the courts responsibly.",
          sort_order: 1,
          created_at: "2026-08-25T00:00:00.000Z",
          updated_at: "2026-08-25T00:00:00.000Z",
        }],
      }],
    }],
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/queries/use-payment-methods", () => ({
  usePublicPaymentMethods: () => ({
    data: [
      {
        id: 1,
        name: "GCash",
        qr_image_url: "http://localhost:8000/storage/payment-methods/gcash.png",
        account_name: "Dinks on Us",
        account_number: "09123456789",
      },
      {
        id: 2,
        name: "BPI",
        qr_image_url: "http://localhost:8000/storage/payment-methods/bpi.png",
        account_name: "Dinks on Us PH",
        account_number: "0011223344",
      },
    ],
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useSubmitReservation: () => ({ mutate: vi.fn(), mutateAsync: submitReservationMock, isPending: false }),
}));

beforeEach(() => {
  toastErrorMock.mockReset();
  submitReservationMock.mockReset();
  submitReservationMock.mockResolvedValue({ data: { id: 1, reference_number: "RSV-100", status: "PENDING" } });
  window.sessionStorage.setItem(
    RESERVATION_DRAFT_STORAGE_KEY,
    JSON.stringify({
      selectedSlots: [
        { courtId: 1, courtName: "Court 1", date: "2026-08-13", startHour: 7, endHour: 8, available: true, price: 500 },
      ],
      equipment: [{ id: 1, name: "Paddle", price: 100, quantity: 1 }],
      additionalPlayers: 1,
      additionalPlayerUnitPrice: 100,
      includedPlayersPerCourt: 4,
    }),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("ReservationCheckout", () => {
  it("shows the full cost breakdown and enables submission after acknowledgment", async () => {
    const user = userEvent.setup();
    render(<ReservationCheckout />);

    const summary = screen.getByRole("heading", { name: "1 court slot" }).closest("section");
    expect(summary).not.toBeNull();
    const policyHeading = screen.getByRole("heading", { name: "Court Rules & Policy" });
    expect(summary!.compareDocumentPosition(policyHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByRole("button", { name: "Review the rules" })).toBeInTheDocument();
    expect(within(summary!).getByText("Court 1")).toBeInTheDocument();
    expect(within(summary!).getByText("₱500", { selector: "span" })).toBeInTheDocument();
    expect(within(summary!).getByText("Paddle × 1")).toBeInTheDocument();
    expect(within(summary!).getByText("₱700", { selector: "dd" })).toBeInTheDocument();
    const total = summary!.querySelector("dl");
    expect(total).not.toBeNull();
    expect(within(total!).queryByText("Court rental")).not.toBeInTheDocument();
    expect(within(total!).queryByText("Equipment rental")).not.toBeInTheDocument();
    expect(within(total!).queryByText("Additional players")).not.toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Submit reservation" });
    expect(submit).toBeDisabled();

    expect(screen.getByRole("combobox", { name: "E-wallet or Bank" })).toHaveTextContent("GCash");
    expect(screen.getByRole("img", { name: "GCash payment QR code" })).toHaveAttribute("src", expect.stringContaining("gcash.png"));
    expect(screen.getByText("09123456789")).toBeInTheDocument();
    expect(screen.getByText("Dinks on Us", { selector: "dd" })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "E-wallet or Bank" }));
    await user.click(await screen.findByRole("option", { name: "BPI" }));
    expect(screen.getByRole("img", { name: "BPI payment QR code" })).toHaveAttribute("src", expect.stringContaining("bpi.png"));
    expect(screen.getByText("0011223344")).toBeInTheDocument();
    expect(screen.getByText("Dinks on Us PH")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Reservation acknowledgment/ }));
    expect(submit).toBeEnabled();
  });

  it("opens checkout policy links in a dialog without losing entered details", async () => {
    const user = userEvent.setup();
    render(<ReservationCheckout />);

    const nameInput = screen.getByRole("textbox", { name: "Full name" });
    await user.type(nameInput, "Mark Justin Sayson");
    await user.click(screen.getByRole("button", { name: "Court Rules & Policy" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Court Rules & Policy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(nameInput).toHaveValue("Mark Justin Sayson");
  });

  it("shows an empty state when checkout is opened without a selection", () => {
    window.sessionStorage.clear();
    render(<ReservationCheckout />);

    expect(screen.getByRole("heading", { name: "No reservation selected yet" })).toBeInTheDocument();
  });

  it("shows inline validation errors when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<ReservationCheckout />);

    await user.click(screen.getByRole("checkbox", { name: /Reservation acknowledgment/ }));
    await user.click(screen.getByRole("button", { name: "Submit reservation" }));

    expect(screen.getByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your mobile number.")).toBeInTheDocument();
    expect(screen.getByText("Enter the transaction reference number.")).toBeInTheDocument();
    expect(screen.getByText("Select a payment proof image.")).toBeInTheDocument();
    expect(toastErrorMock).toHaveBeenCalledWith("Please complete all required fields before submitting.");
  });

  it("requires email confirmation before sending the reservation", async () => {
    const user = userEvent.setup();
    render(<ReservationCheckout />);

    await user.type(screen.getByRole("textbox", { name: "Full name" }), "Mark Justin Sayson");
    await user.type(screen.getByRole("textbox", { name: "Email address" }), "mark@example.com");
    await user.type(screen.getByRole("textbox", { name: "Mobile number" }), "09123456789");
    await user.type(screen.getByRole("textbox", { name: "Transaction reference number" }), "TX-12345");
    const receiptInput = document.getElementById("payment-receipt");
    expect(receiptInput).toBeInstanceOf(HTMLInputElement);
    await user.upload(receiptInput as HTMLInputElement, new File(["receipt"], "receipt.png", { type: "image/png" }));
    await user.click(screen.getByRole("checkbox", { name: /Reservation acknowledgment/ }));
    await user.click(screen.getByRole("button", { name: "Submit reservation" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Is this email address correct?" })).toBeInTheDocument();
    expect(screen.getByText("mark@example.com")).toBeInTheDocument();
    expect(submitReservationMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Yes, submit reservation" }));

    expect(submitReservationMock).toHaveBeenCalledTimes(1);
  });
});
