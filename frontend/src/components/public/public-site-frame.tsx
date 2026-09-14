import type { ReactNode } from "react";
import { FiMessageCircle } from "react-icons/fi";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { siteConfig } from "@/config/site";

type PublicSiteFrameProps = {
  children: ReactNode;
  showFooter?: boolean;
  showMessageButton?: boolean;
};

export function PublicMessageButton() {
  return (
    <a href={siteConfig.facebookUrl} target="_blank" rel="noreferrer" aria-label="Message Us on Facebook" title="Message Us" className="fixed bottom-5 right-5 z-40 flex min-h-12 animate-fade-up items-center gap-2 rounded-full bg-energy px-4 text-sm font-extrabold text-energy-foreground shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-energy/90 motion-reduce:animate-none sm:bottom-7 sm:right-7">
      <FiMessageCircle className="size-5" aria-hidden="true" />
      <span>Message Us</span>
    </a>
  );
}

export function PublicSiteFrame({ children, showFooter = true, showMessageButton = true }: PublicSiteFrameProps) {
  return (
    <>
      <PublicHeader />
      <div className="animate-fade-up motion-reduce:animate-none">
        {children}
        {showFooter ? <PublicFooter /> : null}
      </div>
      {showMessageButton ? (
        <PublicMessageButton />
      ) : null}
    </>
  );
}
