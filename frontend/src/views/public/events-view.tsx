"use client";

import Link from "next/link";
import { useState } from "react";
import { FiArrowRight, FiCalendar } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Pagination } from "@/components/common/pagination";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { usePublicEvents } from "@/hooks/queries/use-events";
import { formatDateOnly } from "@/lib/date";

export function EventsView() {
  const [page, setPage] = useState(1);
  const query = usePublicEvents(page);

  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <div className="mx-auto max-w-[76rem] px-6 pb-6 sm:px-10 sm:pb-8">
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-foreground sm:text-5xl">
            Find more ways to play together.
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground sm:text-lg">
            Discover upcoming activities and the latest announcements from Dinks on Us.
          </p>
        </div>

        <section className="mx-auto max-w-[76rem] px-6 pb-14 sm:px-10" aria-label="Published events">
          {query.isPending ? (
            <LoadingState message="Loading events…" />
          ) : query.isError ? (
            <ErrorState title="We couldn't load the events." onRetry={() => void query.refetch()} />
          ) : query.data.data.length === 0 ? (
            <EmptyState title="No events have been published yet." description="New events and announcements will appear here." />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {query.data.data.map((event) => (
                  <article key={event.id} className="group flex h-[32rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
                    <div className="h-56 shrink-0 overflow-hidden border-b bg-muted/35">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.image_url} alt={event.header} className="size-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]" />
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-energy">
                        <FiCalendar aria-hidden="true" />
                        <time dateTime={event.event_date}>{formatDateOnly(event.event_date)}</time>
                      </div>
                      <h2 className="mt-3 line-clamp-2 font-heading text-2xl font-extrabold leading-8 tracking-[-.04em]">{event.header}</h2>
                      <p className="mt-2 line-clamp-3 whitespace-pre-line leading-7 text-muted-foreground">{event.description}</p>
                      <Link
                        href={`/events/${event.slug}`}
                        className="mt-auto inline-flex min-h-11 items-center gap-2 self-start font-extrabold uppercase tracking-[.14em] text-energy outline-none transition-colors hover:text-energy/80 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        See Full Article
                        <FiArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {query.data.meta.last_page > 1 ? <div className="mt-8"><Pagination page={page} lastPage={query.data.meta.last_page} onChange={setPage} /></div> : null}
            </>
          )}
        </section>
      </main>
    </PublicSiteFrame>
  );
}
