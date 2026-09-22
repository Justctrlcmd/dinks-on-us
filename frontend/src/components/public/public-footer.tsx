import Link from "next/link";
import { FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import { mockPublicSite } from "@/config/mock-public-site";
import { siteConfig } from "@/config/site";

const exploreNavigation = [
  { label: "Home", href: "/" },
  { label: "Reserve", href: "/reserve" },
  { label: "Events", href: "/events" },
  { label: "FAQ", href: "/faq" },
] as const;

const policyNavigation = [
  { label: "Court Rules & Policy", href: "/policies/court-rules" },
  { label: "Reservation Rules & Policy", href: "/policies/reservation-rules" },
  { label: "Reschedule Policy", href: "/policies/reschedule-policy" },
  { label: "Cancellation Policy", href: "/policies/cancellation-policy" },
] as const;

export function PublicFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-brand-surface text-brand-surface-foreground dark:border-[#ded8ca] dark:bg-[#f7f3e9] dark:text-[#213547]">
      <div className="mx-auto grid max-w-[96rem] gap-12 px-6 py-14 sm:px-10 lg:grid-cols-[1.3fr_.7fr_.9fr_.7fr] lg:px-30 lg:py-18">
        <div>
          <p className="font-heading text-3xl font-extrabold tracking-[-0.05em]">Dinks on Us</p>
          <p className="mt-4 max-w-sm leading-7 text-white/70 dark:text-[#556771]">A welcoming pickleball home for players and community in Bulacan, Philippines.</p>
          <div className="mt-5 flex items-center gap-2" aria-label="Social media links">
            <a
              href={siteConfig.facebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Dinks on Us on Facebook"
              className="flex size-9 items-center justify-center rounded-full border border-white/20 text-white/85 transition-colors hover:border-white/50 hover:text-white dark:border-[#b9c0c1] dark:text-[#213547] dark:hover:border-[#213547] dark:hover:text-brand-surface"
            >
              <FaFacebookF className="size-4" aria-hidden="true" />
            </a>
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Dinks on Us on Instagram"
              className="flex size-9 items-center justify-center rounded-full border border-white/20 text-white/85 transition-colors hover:border-white/50 hover:text-white dark:border-[#b9c0c1] dark:text-[#213547] dark:hover:border-[#213547] dark:hover:text-brand-surface"
            >
              <FaInstagram className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/55 dark:text-[#6b7a86]">Explore</h2>
          <nav aria-label="Footer navigation" className="mt-5 grid gap-3">
            {exploreNavigation.map((item) => <Link key={item.label} href={item.href} className="w-fit text-sm font-semibold text-white/85 transition-colors hover:text-white hover:underline hover:underline-offset-4 dark:text-[#213547] dark:hover:text-brand-surface">{item.label}</Link>)}
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/55 dark:text-[#6b7a86]">Policies</h2>
          <nav aria-label="Policy navigation" className="mt-5 grid gap-3">
            {policyNavigation.map((item) => <Link key={item.label} href={item.href} className="w-fit text-sm font-semibold text-white/85 transition-colors hover:text-white hover:underline hover:underline-offset-4 dark:text-[#213547] dark:hover:text-brand-surface">{item.label}</Link>)}
          </nav>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/55 dark:text-[#6b7a86]">Visit & connect</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <a href="mailto:dinksonusph@gmail.com" className="flex items-center gap-2 font-semibold text-white/85 transition-colors hover:text-white dark:text-[#213547] dark:hover:text-brand-surface">
              <FiMail className="size-4 shrink-0" aria-hidden="true" />
              <span>dinksonusph@gmail.com</span>
            </a>
            <a href="tel:09062932366" className="flex items-center gap-2 font-semibold text-white/85 transition-colors hover:text-white dark:text-[#213547] dark:hover:text-brand-surface">
              <FiPhone className="size-4 shrink-0" aria-hidden="true" />
              <span>09062932366</span>
            </a>
            <div className="flex items-start gap-2 text-white/70 dark:text-[#556771]">
              <FiMapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <a
                href={mockPublicSite.location.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white hover:underline hover:underline-offset-4 dark:hover:text-brand-surface"
              >
                <span className="block font-semibold text-white/85 dark:text-[#213547]">Sta. Lucia, Angat, Bulacan</span>
                <span className="mt-0.5 block text-xs leading-5">In front of Boss Gasoline Station</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15 px-6 py-5 text-center text-xs text-white/55 dark:border-[#ded8ca] dark:text-[#6b7a86] sm:px-10 lg:px-30">© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</div>
    </footer>
  );
}
