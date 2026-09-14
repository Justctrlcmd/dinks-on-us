"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ScrollRevealSectionProps = ComponentPropsWithoutRef<"section">;

/**
 * Reveals a landing-page section once it reaches the viewport without changing
 * its document flow or reserving a second layout state.
 */
export function ScrollRevealSection({ children, className, ...props }: ScrollRevealSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    if (reduceMotion?.matches || !sectionRef.current || !("IntersectionObserver" in window)) {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setIsRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.1 },
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-revealed={isRevealed}
      className={cn(
        "translate-y-5 opacity-0 transition-[opacity,transform] duration-[600ms] ease-out data-[revealed=true]:translate-y-0 data-[revealed=true]:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
