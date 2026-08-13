import type { ReactNode } from "react";
import Link from "next/link";
import { FiMessageCircle } from "react-icons/fi";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

type PublicSiteFrameProps = {
  children: ReactNode;
  showFooter?: boolean;
  showMessageButton?: boolean;
};

export function PublicSiteFrame({ children, showFooter = true, showMessageButton = true }: PublicSiteFrameProps) {
  return (
    <>
      <PublicHeader />
      {children}
      {showMessageButton ? (
        <Link href="#contact" aria-label="Messenger details coming soon" className="fixed bottom-5 right-5 z-40 flex min-h-12 items-center gap-2 rounded-full bg-energy px-4 text-sm font-extrabold text-energy-foreground shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-energy/90 sm:bottom-7 sm:right-7">
          <FiMessageCircle className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">Message us</span>
        </Link>
      ) : null}
      {showFooter ? <PublicFooter /> : null}
    </>
  );
}
