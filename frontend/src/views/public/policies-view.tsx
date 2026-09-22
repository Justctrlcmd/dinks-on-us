"use client";

import Link from "next/link";
import { FiArrowUpRight, FiFileText } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { publicPolicies } from "@/config/public-policies";
import { usePublicPolicies } from "@/hooks/queries/use-policies";
import type { PolicySection } from "@/types/policy";

export function PoliciesView({ initialPolicies }: { initialPolicies?: PolicySection[] }) {
  const query = usePublicPolicies(initialPolicies);
  const sections = query.data ?? [];

  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <div className="mx-auto max-w-[76rem] px-6 pb-6 sm:px-10 sm:pb-8">
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-foreground sm:text-5xl">
            Rules & Policies
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground sm:text-lg">
            Review the policies that apply when you play or book with Dinks on Us.
          </p>
        </div>

        <section className="mx-auto max-w-[76rem] px-6 pb-14 sm:px-10" aria-label="Policies">
          {query.isPending ? (
            <LoadingState message="Loading rules and policies…" />
          ) : query.isError ? (
            <ErrorState title="We couldn't load the policies." onRetry={() => void query.refetch()} />
          ) : sections.length === 0 ? (
            <EmptyState
              title="No policies have been published yet."
              description="Please contact Dinks on Us directly if you need help with a reservation."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {publicPolicies.map((policy) => {
                const section = sections.find((item) => item.slug === policy.slug);

                if (!section) return null;

                return (
                  <Link
                    key={policy.slug}
                    href={`/policies/${policy.slug}`}
                    className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/45 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:p-7"
                  >
                    <div className="flex items-center gap-3">
                      <FiFileText className="size-6 shrink-0 text-primary" aria-hidden="true" />
                      <h2 className="font-heading text-xl font-extrabold tracking-[-.04em] sm:text-2xl">
                        {policy.title}
                      </h2>
                    </div>
                    <p className="mt-3 leading-7 text-muted-foreground">{policy.description}</p>
                    <span className="mt-5 inline-flex items-center gap-2 font-semibold text-primary">
                      Read policy
                      <FiArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </PublicSiteFrame>
  );
}
