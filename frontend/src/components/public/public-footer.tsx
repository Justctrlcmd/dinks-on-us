import Link from "next/link";
import { FiArrowUpRight, FiMapPin, FiMessageCircle } from "react-icons/fi";
import { siteConfig } from "@/config/site";

const footerNavigation = [
  { label: "Home", href: "/" },
  { label: "Reserve", href: "/reserve" },
  { label: "Events", href: "/events" },
  { label: "FAQ", href: "/faq" },
] as const;

export function PublicFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-brand-surface text-brand-surface-foreground dark:border-[#ded8ca] dark:bg-[#f7f3e9] dark:text-[#213547]">
      <div className="mx-auto grid max-w-[96rem] gap-12 px-6 py-14 sm:px-10 lg:grid-cols-[1.3fr_.7fr_.7fr] lg:px-30 lg:py-18">
        <div>
          <p className="font-heading text-3xl font-extrabold tracking-[-0.05em]">Dinks on Us</p>
          <p className="mt-4 max-w-sm leading-7 text-white/70 dark:text-[#556771]">A welcoming pickleball home for players and community in Bulacan, Philippines.</p>
          <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/80 dark:text-[#213547]"><FiMapPin aria-hidden="true" /> Bulacan, Philippines</p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/55 dark:text-[#6b7a86]">Explore</h2>
          <nav aria-label="Footer navigation" className="mt-5 grid gap-3">
            {footerNavigation.map((item) => <Link key={item.label} href={item.href} className="w-fit text-sm font-semibold text-white/85 transition-colors hover:text-white hover:underline hover:underline-offset-4 dark:text-[#213547] dark:hover:text-primary">{item.label}</Link>)}
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/55 dark:text-[#6b7a86]">Visit & connect</h2>
          <p className="mt-5 text-sm leading-6 text-white/70 dark:text-[#556771]">Exact venue address, hours, and official Messenger link will be published by Dinks on Us.</p>
          <a href="#contact" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-white/75 dark:text-[#213547] dark:hover:text-primary"><FiMessageCircle aria-hidden="true" /> Messenger details coming soon <FiArrowUpRight aria-hidden="true" /></a>
        </div>
      </div>
      <div className="border-t border-white/15 px-6 py-5 text-center text-xs text-white/55 dark:border-[#ded8ca] dark:text-[#6b7a86] sm:px-10 lg:px-30">© {new Date().getFullYear()} {siteConfig.name}. Preview content will be replaced with staff-managed site details.</div>
    </footer>
  );
}
