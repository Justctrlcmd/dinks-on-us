import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingGallerySection } from "./landing-gallery-section";

const { galleryQuery } = vi.hoisted(() => ({
  galleryQuery: {
    data: [
      {
        id: 2,
        name: "Services",
        display_order: 1,
        image_count: 1,
        images: [{ id: 20, gallery_tab_id: 2, image_url: "/services.jpg", alt_text: "Player receiving coaching", display_order: 1, created_at: "2026-08-25T00:00:00Z", updated_at: "2026-08-25T00:00:00Z" }],
        created_at: "2026-08-25T00:00:00Z",
        updated_at: "2026-08-25T00:00:00Z",
      },
      {
        id: 1,
        name: "Interior",
        display_order: 2,
        image_count: 1,
        images: [{ id: 10, gallery_tab_id: 1, image_url: "/interior.jpg", alt_text: "Indoor pickleball courts", display_order: 1, created_at: "2026-08-25T00:00:00Z", updated_at: "2026-08-25T00:00:00Z" }],
        created_at: "2026-08-25T00:00:00Z",
        updated_at: "2026-08-25T00:00:00Z",
      },
    ],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
}));

vi.mock("@/hooks/queries/use-gallery", () => ({ usePublicGallery: () => galleryQuery }));

afterEach(() => cleanup());

describe("LandingGallerySection", () => {
  it("renders ordered dynamic tabs without an All tab and filters images by category", async () => {
    const user = userEvent.setup();
    render(<LandingGallerySection />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Services", "Interior"]);
    expect(screen.queryByRole("tab", { name: "All" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Player receiving coaching" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Indoor pickleball courts" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Interior" }));

    expect(screen.getByRole("img", { name: "Indoor pickleball courts" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Player receiving coaching" })).not.toBeInTheDocument();
  });
});
