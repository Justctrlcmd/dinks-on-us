"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiArrowUpRight, FiMenu } from "react-icons/fi";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const publicNavigation = [
  { label: "Home", href: "/" },
  { label: "Reserve", href: "/reserve" },
  { label: "Events", href: "/events" },
  { label: "FAQ", href: "/faq" },
  { label: "Policies", href: "/policies" },
] as const;

function Brand({ onHero }: { onHero: boolean }) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-white sm:gap-3"
      aria-label={`${siteConfig.name} home`}
    >
      <Image
        src="/images/dinks-on-us-logo.png"
        alt=""
        width={56}
        height={35}
        sizes="(min-width: 640px) 56px, 48px"
        className="h-auto w-12 shrink-0 object-contain sm:w-14"
        aria-hidden="true"
      />
      <span className={cn("font-heading text-base font-extrabold tracking-[-0.04em] max-[359px]:sr-only sm:text-xl", onHero ? "text-white" : "text-foreground")}>
        Dinks on Us
      </span>
    </Link>
  );
}

function MobileNavigation({ onHero, pathname }: { onHero: boolean; pathname: string }) {
  return (
    <details className="group relative lg:hidden">
      <summary className={cn("flex size-10 cursor-pointer list-none items-center justify-center rounded-full border backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden", onHero ? "border-white/25 bg-black/15 text-white hover:bg-white/15 focus-visible:outline-white" : "border-border bg-card/80 text-foreground hover:bg-muted focus-visible:outline-ring")}>
        <FiMenu className="size-4" aria-hidden="true" />
        <span className="sr-only">Open navigation</span>
      </summary>
      <nav aria-label="Mobile navigation" className="absolute right-0 top-12 grid min-w-44 gap-1 rounded-2xl border border-white/20 bg-brand-surface/95 p-2 text-sm font-semibold text-white shadow-xl backdrop-blur-xl">
        {publicNavigation.map((item) => {
          const current = pathname === item.href;
          return (
            <Link key={item.label} href={item.href} aria-current={current ? "page" : undefined} className={current ? "rounded-xl bg-white px-4 py-2.5 text-brand-surface" : "rounded-xl px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white"}>
              {item.label}
            </Link>
          );
        })}
        <Link href="/login" className="rounded-xl px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white">
          Admin
        </Link>
      </nav>
    </details>
  );
}

function ReclubLink() {
  return (
    <a
      href="https://reclub.co/clubs/@dinks-on-us-kqnnyb"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Visit Dinks on Us on Reclub"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4bf46] p-2 shadow-sm transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
    >
      <Image src="/images/reclub-icon.png" alt="" width={28} height={28} className="size-7 object-contain" aria-hidden="true" />
    </a>
  );
}

export function PublicHeader() {
  const pathname = usePathname();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [onHero, setOnHero] = useState(pathname === "/");
  const previousScrollY = useRef(0);

  useEffect(() => {
    previousScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const movement = currentScrollY - previousScrollY.current;
      const heroBoundary = window.innerHeight * 0.7;

      setOnHero(pathname === "/" && currentScrollY < heroBoundary);

      if (currentScrollY < 64) {
        setHeaderVisible(true);
      } else if (Math.abs(movement) > 6) {
        setHeaderVisible(movement < 0);
      }

      previousScrollY.current = currentScrollY;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-transform duration-300 motion-reduce:transition-none", headerVisible ? "translate-y-0" : "-translate-y-full", onHero ? "bg-gradient-to-b from-black/55 via-black/20 to-transparent" : "border-b border-border/70 bg-background/85 shadow-sm backdrop-blur-xl")}>
      <div className="mx-auto flex h-20 w-full max-w-[96rem] animate-fade-up items-center justify-between gap-3 px-6 sm:h-24 sm:px-10 lg:px-30 motion-reduce:animate-none">
        <Brand onHero={onHero} />
        <nav aria-label="Primary navigation" className={cn("hidden items-center gap-1 rounded-full border p-1.5 text-sm font-semibold shadow-sm backdrop-blur-md lg:flex", onHero ? "border-white/25 bg-black/15 text-white" : "border-border bg-card/75 text-foreground")}>
          {publicNavigation.map((item) => {
            const current = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} aria-current={current ? "page" : undefined} className={current ? "rounded-full bg-white px-4 py-2 text-brand-surface shadow-sm transition-colors" : cn("rounded-full px-4 py-2 transition-colors", onHero ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className={cn("size-10 rounded-full border backdrop-blur-md", onHero ? "border-white/25 bg-black/15 text-white hover:bg-white/15 hover:text-white" : "border-border bg-card/80 text-foreground hover:bg-muted hover:text-foreground")} />
          <ReclubLink />
          <Button size="lg" nativeButton={false} className="hidden h-10 rounded-full border border-white/70 bg-white px-3 text-[0.8rem] font-bold text-brand-surface shadow-sm hover:bg-white/90 lg:inline-flex lg:px-5 lg:text-sm" render={<Link href="/login" />}>
            Admin
            <span className="ml-1 flex size-6 items-center justify-center rounded-full bg-brand-surface text-white"><FiArrowUpRight className="size-3.5" aria-hidden="true" /></span>
          </Button>
          <MobileNavigation onHero={onHero} pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
