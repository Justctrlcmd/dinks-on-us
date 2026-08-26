"use client";

import Link from "next/link";
import { FiArrowUpRight, FiHelpCircle } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { Button } from "@/components/ui/button";
import { usePublicFaqs } from "@/hooks/queries/use-faqs";

export function FaqView() {
  const query = usePublicFaqs();

  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <div className="mx-auto max-w-[76rem] px-6 pb-6 sm:px-10 sm:pb-8">
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-foreground sm:text-5xl">
            Everything you need before you play.
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground sm:text-lg">
            Find quick answers about reservations, payments, court time, and your visit.
          </p>
        </div>
        <section>
          <div className="mx-auto max-w-[76rem] px-6 pb-12 sm:px-10 ">
            {query.isPending ? (
              <LoadingState message="Loading frequently asked questions…" />
            ) : query.isError ? (
              <ErrorState title="We couldn't load the FAQs." onRetry={() => void query.refetch()} />
            ) : query.data.length === 0 ? (
              <EmptyState
                title="No FAQs have been published yet."
                description="Contact Dinks on Us directly if you need help planning your visit."
              />
            ) : (
              <div className="grid gap-4">
                {query.data.map((faq) => (
                <details
                  key={faq.id}
                  className="group rounded-2xl border border-border bg-card p-6 open:border-energy/55"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-heading text-lg font-extrabold tracking-[-.025em]">
                    <span>{faq.question}</span>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-energy/15 text-energy transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-5 max-w-3xl whitespace-pre-line leading-7 text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
                ))}
              </div>
            )}
            <div className="mt-12 rounded-2xl border border-energy/40 bg-card p-7 text-card-foreground shadow-sm sm:p-9 lg:flex lg:items-center lg:justify-between lg:gap-12">
              <div className="max-w-xl">
                <FiHelpCircle className="size-8 text-energy lg:hidden" aria-hidden="true" />
                <h2 className="mt-6 font-heading text-2xl font-extrabold lg:mt-0">
                  Still have a question?
                </h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Official Messenger contact details will be published by Dinks on
                  Us for direct questions and cancellation requests.
                </p>
                <Button
                  nativeButton={false}
                  className="mt-7 h-12 rounded-full bg-energy px-5 font-extrabold text-energy-foreground hover:bg-energy/90"
                  render={<Link href="#contact" />}
                >
                  Contact details{" "}
                  <span className="ml-1 flex size-7 items-center justify-center rounded-full bg-brand-surface text-white">
                    <FiArrowUpRight className="size-3.5" aria-hidden="true" />
                  </span>
                </Button>
              </div>
              <FiHelpCircle className="hidden size-32 shrink-0 text-energy lg:block xl:size-36" aria-hidden="true" />
            </div>
          </div>
        </section>
      </main>
    </PublicSiteFrame>
  );
}
