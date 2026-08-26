import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GalleryManagementView } from "./gallery-management-view";

const { mutation, tabs } = vi.hoisted(() => ({
  mutation: { mutateAsync: vi.fn(), isPending: false },
  tabs: [
    { id: 1, name: "Services", display_order: 1, image_count: 1, created_at: "2026-08-25T00:00:00Z", updated_at: "2026-08-25T00:00:00Z" },
    { id: 2, name: "Interior", display_order: 2, image_count: 1, created_at: "2026-08-25T00:00:00Z", updated_at: "2026-08-25T00:00:00Z" },
  ],
}));

vi.mock("@/hooks/mutations/use-gallery-mutations", () => ({
  useDeleteGalleryImage: () => mutation,
  useDeleteGalleryTab: () => mutation,
  useUpdateGalleryImageOrder: () => mutation,
  useUpdateGalleryTabOrder: () => mutation,
  useCreateGalleryImage: () => mutation,
  useUpdateGalleryImage: () => mutation,
  useCreateGalleryTab: () => mutation,
  useUpdateGalleryTab: () => mutation,
}));

vi.mock("@/hooks/queries/use-gallery", () => ({
  useGalleryTabs: () => ({ data: tabs, isPending: false, isError: false, refetch: vi.fn() }),
  useGalleryImages: (tabId: number | null) => ({
    data: tabId === 2
      ? [{ id: 2, gallery_tab_id: 2, image_url: "/interior.jpg", alt_text: "Interior court view", display_order: 1, created_at: "2026-08-25T00:00:00Z", updated_at: "2026-08-25T00:00:00Z" }]
      : [{ id: 1, gallery_tab_id: 1, image_url: "/services.jpg", alt_text: "Player coaching session", display_order: 1, created_at: "2026-08-25T00:00:00Z", updated_at: "2026-08-25T00:00:00Z" }],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => cleanup());

describe("GalleryManagementView", () => {
  it("uses configured categories without an All tab and changes the active image board", async () => {
    const user = userEvent.setup();
    render(<GalleryManagementView />);

    expect(screen.getByRole("heading", { name: "Landing Gallery" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add category" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add image" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /All/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Services images" })).toBeInTheDocument();
    expect(screen.getByText("Player coaching session")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Interior/ }));

    expect(screen.getByRole("heading", { name: "Interior images" })).toBeInTheDocument();
    expect(screen.getByText("Interior court view")).toBeInTheDocument();
    expect(screen.queryByText("Player coaching session")).not.toBeInTheDocument();
  });
});
