import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollRevealSection } from "./scroll-reveal-section";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScrollRevealSection", () => {
  it("reveals once the section enters the viewport", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    let onIntersect: IntersectionObserverCallback | undefined;

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
          onIntersect = callback;
          expect(options).toEqual({ threshold: 0.1 });
        }

        observe = observe;
        disconnect = disconnect;
        root = null;
        rootMargin = "";
        thresholds = [];
        takeRecords = () => [];
        unobserve = vi.fn();
      },
    );

    render(<ScrollRevealSection aria-label="Services">Content</ScrollRevealSection>);

    const section = screen.getByRole("region", { name: "Services" });
    expect(section).toHaveAttribute("data-revealed", "false");
    expect(observe).toHaveBeenCalledWith(section);

    act(() => onIntersect?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

    expect(section).toHaveAttribute("data-revealed", "true");
    expect(disconnect).toHaveBeenCalled();
  });

  it("shows content immediately when reduced motion is preferred", () => {
    const observe = vi.fn();
    vi.stubGlobal("IntersectionObserver", class { observe = observe; disconnect = vi.fn(); });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));

    render(<ScrollRevealSection aria-label="Visit">Content</ScrollRevealSection>);

    expect(screen.getByRole("region", { name: "Visit" })).toHaveAttribute("data-revealed", "true");
    expect(observe).not.toHaveBeenCalled();
  });
});
