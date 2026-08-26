"use client";

import Link from "next/link";
import { FiArrowLeft, FiCalendar } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { Button } from "@/components/ui/button";
import { usePublicEvent } from "@/hooks/queries/use-events";
import { isApiError } from "@/lib/api";
import { formatDateOnly } from "@/lib/date";

export function EventDetailView({ slug }: { slug: string }) {
  const query = usePublicEvent(slug);
  const missing = query.isError && isApiError(query.error) && query.error.status === 404;

  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-20 sm:pt-24">
        {query.isPending ? (
          <div className="mx-auto max-w-[76rem] px-6 py-20 sm:px-10"><LoadingState message="Loading event…" fullPage /></div>
        ) : missing ? (
          <div className="mx-auto max-w-[76rem] px-6 py-20 sm:px-10">
            <EmptyState
              title="This event is no longer available."
              description="It may have been removed or the link may be incorrect."
              action={<Button nativeButton={false} variant="outline" render={<Link href="/events" />}><FiArrowLeft aria-hidden="true" />Back to Events</Button>}
            />
          </div>
        ) : query.isError ? (
          <div className="mx-auto max-w-[76rem] px-6 py-20 sm:px-10"><ErrorState title="We couldn't load this event." onRetry={() => void query.refetch()} /></div>
        ) : (
          <>
            <article className="relative mx-auto max-w-5xl px-6 py-8 sm:px-10 sm:py-12">
              <Link
                href="/events"
                className="absolute top-8 right-6 z-10 inline-flex min-h-11 items-center gap-1.5 text-md font-semibold tracking-[.04em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:top-12 sm:right-10"
              >
                <FiArrowLeft aria-hidden="true" />Back to events
              </Link>

              <p className="flex min-h-11 items-center gap-2 text-sm font-extrabold uppercase tracking-[.16em] text-energy sm:text-base">
                <FiCalendar aria-hidden="true" />
                <time dateTime={query.data.event_date}>{formatDateOnly(query.data.event_date)}</time>
              </p>
              <h1 className="mt-1 max-w-4xl font-heading text-4xl font-extrabold leading-[1.02] tracking-[-.055em] text-foreground sm:text-6xl">{query.data.header}</h1>

              <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="aspect-[16/9] bg-muted/35">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={query.data.image_url} alt={query.data.header} className="size-full object-cover" />
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
                <p className="whitespace-pre-line text-base leading-8 text-foreground/90 sm:text-lg">{query.data.description}</p>
              </div>
            </article>
          </>
        )}
      </main>
    </PublicSiteFrame>
  );
}
