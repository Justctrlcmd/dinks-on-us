import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReservationCheckout } from "@/components/public/reservation/reservation-checkout";
import { NormalizedApiError } from "@/lib/api";
import { RESERVATION_DRAFT_STORAGE_KEY } from "@/types/reservation";

const mocks = vi.hoisted(() => {
  const defaultPaymentMethods = [
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
  ];

  return {
    submitReservationMock: vi.fn(),
    toastErrorMock: vi.fn(),
    reservationOptionsRefetchMock: vi.fn(),
    defaultPaymentMethods,
    paymentMethods: [...defaultPaymentMethods],
    reservationOptions: {
      date: "2026-08-13",
      configuration: {
        id: 1, opening_hour: 7, closing_hour: 22, included_players_per_court: 4, additional_player_price: 100, advance_booking_days: 30,
        weekday_rates: [], weekend_rates: [], created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z",
      },
      courts: [{ id: 1, court_number: 1, name: "Court 1", created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" }],
      slots: [{ start_hour: 7, end_hour: 8, price: 500 }],
      is_date_closed: false,
      unavailable_slots: [] as Array<{ court_id: number; start_hour: number }>,
      reserved_slots: [],
      past_slots: [],
      equipment: [{ id: 1, name: "Paddle", price: 100, total_quantity: 10, is_active: true, available_quantity: 10, created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" }],
      equipment_confirmation: "Equipment is checked for your schedule.",
    },
  };
});

vi.mock("@/components/common/toast-provider", () => ({
  useToast: () => ({ success: vi.fn(), error: mocks.toastErrorMock, warning: vi.fn(), info: vi.fn() }),
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
    data: mocks.paymentMethods,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/queries/use-court-pricing", () => ({
  useReservationOptions: () => ({
    data: { ...mocks.reservationOptions },
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: mocks.reservationOptionsRefetchMock,
  }),
}));

vi.mock("@/hooks/mutations/use-reservation-mutations", () => ({
  useSubmitReservation: () => ({ mutate: vi.fn(), mutateAsync: mocks.submitReservationMock, isPending: false }),
}));

beforeEach(() => {
  mocks.toastErrorMock.mockReset();
  mocks.submitReservationMock.mockReset();
  mocks.reservationOptionsRefetchMock.mockReset();
  mocks.submitReservationMock.mockResolvedValue({ data: { id: 1, reference_number: "RSV-100", status: "PENDING" } });
  mocks.paymentMethods.splice(0, mocks.paymentMethods.length, ...mocks.defaultPaymentMethods);
  mocks.reservationOptions.slots[0].price = 500;
  mocks.reservationOptions.equipment[0].price = 100;
  mocks.reservationOptions.equipment[0].available_quantity = 10;
  mocks.reservationOptions.configuration.additional_player_price = 100;
  mocks.reservationOptions.unavailable_slots.splice(0);
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
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Before paying, confirm the account name and number match in your wallet or bank app/);

    await user.click(screen.getByRole("button", { name: "Hide payment safety reminder" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show payment safety reminder" }));
    expect(screen.getByRole("tooltip")).toBeVisible();

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

  it("disables payment evidence when no payment method is available", () => {
    mocks.paymentMethods.splice(0);
    render(<ReservationCheckout />);

    expect(screen.getByRole("combobox", { name: "E-wallet or Bank" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Transaction reference number" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Transaction reference number" })).not.toBeRequired();
    expect(document.getElementById("payment-receipt")).toBeDisabled();
    expect(document.getElementById("payment-receipt")).not.toBeRequired();
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
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("Please complete all required fields before submitting.");
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
    expect(mocks.submitReservationMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Yes, submit reservation" }));

    expect(mocks.submitReservationMock).toHaveBeenCalledTimes(1);
    const submittedInput = mocks.submitReservationMock.mock.calls[0][0].input as FormData;
    expect(submittedInput.get("quoted_amount")).toBe("700.00");
    expect(await screen.findByText("If you do not see our email, please check your spam or junk folder.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Message Us on Facebook" })).toHaveAttribute("href", "https://www.facebook.com/dinksonus");
  });

  it("refreshes availability and closes confirmation when selected times were just booked", async () => {
    const user = userEvent.setup();
    mocks.submitReservationMock.mockRejectedValue(new NormalizedApiError({
      status: 409,
      code: "RESERVATION_SLOTS_UNAVAILABLE",
      message: "Some of your selected times were just booked. Please choose another available time.",
    }));
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
    await user.click(screen.getByRole("button", { name: "Yes, submit reservation" }));

    await waitFor(() => expect(mocks.reservationOptionsRefetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: "Is this email address correct?" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Mark Justin Sayson");
  });

  it("refreshes configured prices and blocks a selection that became unavailable", () => {
    mocks.reservationOptions.slots[0].price = 600;
    const { rerender } = render(<ReservationCheckout />);

    expect(screen.getByText(/Pricing changed after your selection/)).toBeInTheDocument();
    expect(screen.getByText("₱800", { selector: "dd" })).toBeInTheDocument();

    mocks.reservationOptions.unavailable_slots.push({ court_id: 1, start_hour: 7 });
    rerender(<ReservationCheckout />);
    expect(screen.getByText(/no longer available/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit reservation" })).toBeDisabled();
  });
});
