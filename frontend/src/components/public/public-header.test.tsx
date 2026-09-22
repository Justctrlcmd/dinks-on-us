import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicHeader } from "./public-header";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => <span data-testid="next-image" data-src={src} />,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }) }));

afterEach(cleanup);

describe("PublicHeader", () => {
  it("links the rounded Reclub icon to the club page and keeps Admin in the mobile menu", () => {
    render(<PublicHeader />);

    const reclub = screen.getByRole("link", { name: "Visit Dinks on Us on Reclub" });
    expect(reclub).toHaveAttribute("href", "https://reclub.co/clubs/@dinks-on-us-kqnnyb");
    expect(reclub).toHaveAttribute("target", "_blank");
    expect(reclub).toHaveAttribute("rel", "noopener noreferrer");
    expect(reclub).toHaveClass("rounded-full", "bg-[#f4bf46]");
    expect(within(reclub).getByTestId("next-image")).toHaveAttribute("data-src", "/images/reclub-icon.png");

    const mobileNavigation = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(mobileNavigation).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/login");
  });
});
