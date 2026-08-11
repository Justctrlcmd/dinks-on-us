import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";

describe("common states", () => {
  it("exposes accessible loading context", () => { render(<LoadingState message="Loading records..." />); expect(screen.getByRole("status")).toHaveTextContent("Loading records..."); });
  it("renders useful empty-state copy", () => { render(<EmptyState />); expect(screen.getByText("No records yet.")).toBeInTheDocument(); });
  it("supports retrying an error", () => { const retry = vi.fn(); render(<ErrorState onRetry={retry} />); fireEvent.click(screen.getByRole("button", { name: "Try again" })); expect(retry).toHaveBeenCalledOnce(); });
});
