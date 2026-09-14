import Image from "next/image";
import Link from "next/link";
import {
  FiArrowUpRight,
  FiHeart,
  FiMapPin,
  FiShield,
  FiSmile,
  FiTarget,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { LandingGallerySection } from "@/components/public/landing-gallery-section";
import { ScrollRevealSection } from "@/components/public/scroll-reveal-section";
import { Button } from "@/components/ui/button";
import { mockPublicSite } from "@/config/mock-public-site";

const etiquetteIcons = [FiUserCheck, FiTarget, FiUsers, FiHeart, FiShield, FiSmile] as const;

function StepBall({ step }: { step: number }) {
  return (
    <span className="relative flex size-14 items-center justify-center rounded-full border-2 border-energy bg-card font-heading text-sm font-extrabold text-energy shadow-md shadow-energy/15" aria-hidden="true">
      <span>0{step}</span>
      <span className="absolute left-2 top-2 size-1.5 rounded-full bg-energy/65" />
      <span className="absolute right-2.5 top-3 size-1 rounded-full bg-energy/65" />
      <span className="absolute bottom-2.5 left-3 size-1 rounded-full bg-energy/65" />
      <span className="absolute bottom-2 right-2 size-1.5 rounded-full bg-energy/65" />
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-foreground">
        <span className="h-5 w-px bg-foreground" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="mt-4 font-heading text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-5xl">
        {title}
      </h2>
      <p className="mt-3 max-w-xl leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

export function LandingView() {
  return (
    <PublicSiteFrame>
      <main>
        <section className="relative isolate flex min-h-svh overflow-hidden bg-brand-surface text-brand-surface-foreground">
          <Image
            src={mockPublicSite.hero.image}
            alt={mockPublicSite.hero.imageAlt}
            fill
            priority
            sizes="100vw"
            className="z-0 object-cover object-center"
          />
          <div className="absolute inset-0 z-10 bg-black/25" aria-hidden="true" />
          <div
            className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(7,37,44,0.94)_0%,rgba(7,37,44,0.76)_42%,rgba(7,37,44,0.18)_78%,rgba(7,37,44,0.08)_100%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/60 to-transparent"
            aria-hidden="true"
          />

          <div className="relative z-20 mx-auto flex w-full max-w-[96rem] flex-col px-6 pb-16 pt-28 sm:px-10 sm:pb-20 sm:pt-32 lg:px-30">
            <div className="flex flex-1 items-center py-10 sm:py-14">
              <div className="max-w-3xl text-white">
                <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-white/72 sm:text-sm">
                  <span className="h-5 w-px bg-white/65 sm:h-6" aria-hidden="true" />
                  {mockPublicSite.hero.eyebrow}
                </p>
                <h1 className="font-heading text-[clamp(2rem,8.2vw,2.55rem)] font-extrabold leading-[0.96] tracking-[-0.055em] sm:text-[clamp(3rem,5vw,4.8rem)]">
                  {mockPublicSite.hero.titleLines.map((line, index) => (
                    <span key={line} className={index === 1 ? "block whitespace-nowrap text-energy" : "block whitespace-nowrap"}>
                      {line}
                    </span>
                  ))}
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-white/76 sm:text-lg">
                  {mockPublicSite.hero.description}
                </p>
                <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row sm:mt-9">
                  <Button
                    size="lg"
                    nativeButton={false}
                    className="h-13 rounded-full bg-energy px-5 font-extrabold text-energy-foreground shadow-lg shadow-black/15 hover:bg-energy/90"
                    render={<Link href="/reserve" />}
                  >
                    Reserve A Court
                    <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-brand-surface text-white">
                      <FiArrowUpRight aria-hidden="true" />
                    </span>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    nativeButton={false}
                    className="h-13 rounded-full border-white/55 bg-white/10 px-5 font-extrabold text-white backdrop-blur-sm hover:bg-white hover:text-brand-surface dark:hover:bg-white dark:hover:text-brand-surface"
                    render={<Link href="#location" />}
                  >
                    Location
                    <FiMapPin className="ml-2 size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </section>

        <ScrollRevealSection id="etiquette" className="bg-background py-20 sm:py-28">
          <div className="mx-auto max-w-[96rem] px-6 sm:px-10 lg:px-30">
            <SectionHeading
              eyebrow={mockPublicSite.etiquette.eyebrow}
              title={mockPublicSite.etiquette.title}
              description={mockPublicSite.etiquette.description}
            />
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3">
                {mockPublicSite.etiquette.rules.map((rule, index) => {
                  const Icon = etiquetteIcons[index];
                  const hasTabletRightDivider = index % 2 === 0;
                  const hasDesktopRightDivider = index % 3 !== 2;
                  const hasMobileBottomDivider = index < 5;
                  const hasTabletBottomDivider = index < 4;
                  const hasDesktopBottomDivider = index < 3;

                  return (
                    <article
                      key={rule.title}
                      className={`min-h-64 px-0 py-9 ${hasMobileBottomDivider ? "border-b border-border" : ""} sm:px-9 ${hasTabletBottomDivider ? "sm:border-b" : "sm:border-b-0"} ${hasTabletRightDivider ? "sm:border-r" : ""} ${hasDesktopBottomDivider ? "lg:border-b" : "lg:border-b-0"} ${hasDesktopRightDivider ? "lg:border-r" : "lg:border-r-0"}`}
                    >
                      <Icon className="size-12 text-primary" aria-hidden="true" />
                      <h3 className="mt-7 font-heading text-xl font-extrabold tracking-[-0.03em]">
                        {rule.title}
                      </h3>
                      <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                        {rule.description}
                      </p>
                    </article>
                  );
                })}
            </div>
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection id="how-to-reserve" className="border-y border-border bg-card py-20 text-foreground dark:bg-card dark:text-card-foreground sm:py-28">
          <div className="mx-auto max-w-[96rem] px-6 sm:px-10 lg:px-30">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                  <span className="h-5 w-px bg-foreground" aria-hidden="true" />
                  {mockPublicSite.reservation.eyebrow}
                </p>
                <h2 className="mt-4 font-heading text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-5xl">
                  {mockPublicSite.reservation.title}
                </h2>
              </div>
              <Button
                size="lg"
                nativeButton={false}
                className="h-13 w-fit rounded-full bg-energy px-5 font-extrabold text-energy-foreground hover:bg-energy/90"
                render={<Link href="/reserve" />}
              >
                Reserve a Court
                <span className="ml-2 flex size-8 items-center justify-center rounded-full bg-brand-surface text-white">
                  <FiArrowUpRight aria-hidden="true" />
                </span>
              </Button>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {mockPublicSite.reservation.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="relative overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-sm shadow-black/3"
                >
                  <StepBall step={index + 1} />
                  <h3 className="mt-5 font-heading text-xl font-extrabold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </ScrollRevealSection>

        <ScrollRevealSection id="about" className="bg-background py-20 sm:py-28">
          <div className="mx-auto grid max-w-[96rem] gap-10 px-6 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-30">
            <div className="relative min-h-100 overflow-hidden rounded-2xl bg-muted sm:min-h-125">
              <Image
                src={mockPublicSite.hero.image}
                alt="Indoor courts at Dinks on Us"
                fill
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover object-[63%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            </div>
            <div className="lg:pl-8">
              <SectionHeading
                eyebrow={mockPublicSite.about.eyebrow}
                title={mockPublicSite.about.title}
                description={mockPublicSite.about.description}
              />
              <div className="mt-6 border-l-2 border-energy pl-6">
                <p className="font-heading text-2xl font-extrabold leading-tight tracking-[-0.04em] text-foreground">
                  {mockPublicSite.about.statement}
                </p>
              </div>
            </div>
          </div>
        </ScrollRevealSection>

        <LandingGallerySection />

        <ScrollRevealSection id="location" className="bg-background py-20 sm:py-28">
          <div className="mx-auto grid max-w-[96rem] gap-6 px-6 sm:px-10 lg:grid-cols-[.82fr_1.18fr] lg:items-stretch lg:px-30">
            <div className="rounded-2xl border border-border bg-card p-8 sm:p-10">
              <SectionHeading
                eyebrow={mockPublicSite.location.eyebrow}
                title={mockPublicSite.location.title}
                description={mockPublicSite.location.description}
              />
            </div>
            <div className="min-h-90 overflow-hidden rounded-2xl border border-border bg-muted">
              <iframe
                title={`Map showing ${mockPublicSite.location.detailLabel}`}
                src={mockPublicSite.location.mapEmbedUrl}
                className="h-full min-h-90 w-full border-0 grayscale-[20%]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href={mockPublicSite.location.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="sr-only focus:not-sr-only"
              >
                Open Dinks on Us PH - Sports Center in Google Maps
              </a>
            </div>
          </div>
        </ScrollRevealSection>
      </main>
    </PublicSiteFrame>
  );
}
