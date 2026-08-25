import Link from "next/link";
import { FiArrowUpRight, FiCalendar } from "react-icons/fi";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { Button } from "@/components/ui/button";

const previewEvents = [
  {
    category: "Community play",
    title: "Friday Night Open Play",
    description:
      "A social evening for rallies, new teammates, and friendly competition.",
  },
  {
    category: "Club session",
    title: "Weekend Rally Club",
    description:
      "A community session built around movement, match play, and good energy.",
  },
  {
    category: "Getting started",
    title: "New Player Welcome",
    description:
      "A relaxed introduction to court flow, etiquette, and the basics of play.",
  },
] as const;

export function EventsView() {
  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <div className="mx-auto max-w-[76rem] px-6 pb-10 sm:px-10 sm:pb-12">
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-foreground sm:text-5xl">
            Find more ways to play together.
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground sm:text-lg">
            Events are informational and do not automatically change court
            availability. Check the reserve page for reservable slots.
          </p>
        </div>
        <section>
          <div className="mx-auto max-w-[76rem] px-6 pb-12 sm:px-10">
            <div className="grid gap-4 lg:grid-cols-3">
              {previewEvents.map((event) => (
                <article
                  key={event.title}
                  className="rounded-2xl border border-border bg-card p-7"
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-energy">
                    <FiCalendar aria-hidden="true" />
                    {event.category}
                  </div>
                  <h2 className="mt-10 font-heading text-2xl font-extrabold tracking-[-.04em]">
                    {event.title}
                  </h2>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    {event.description}
                  </p>
                  <span className="mt-8 inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-muted-foreground">
                    Schedule to be announced
                  </span>
                </article>
              ))}
            </div>
            <Button
              nativeButton={false}
              className="mt-10 flex- h-12 rounded-full bg-energy px-5 font-extrabold text-energy-foreground hover:bg-energy/90"
              render={<Link href="/reserve" />}
            >
              Reserve a court{" "}
              <span className="ml-1 flex size-7 items-center justify-center rounded-full bg-brand-surface text-white">
                <FiArrowUpRight className="size-3.5" aria-hidden="true" />
              </span>
            </Button>
          </div>
        </section>
      </main>
    </PublicSiteFrame>
  );
}
