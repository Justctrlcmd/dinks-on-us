"use client";

import Link from "next/link";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { usePublicPolicies } from "@/hooks/queries/use-policies";
import type { PolicySection } from "@/types/policy";

type PolicyPageViewProps = {
  title: string;
  description: string;
  slug: PolicySection["slug"];
};

export function PolicyPageView({ title, description, slug, initialPolicies }: PolicyPageViewProps & { initialPolicies?: PolicySection[] }) {
  const query = usePublicPolicies(initialPolicies);
  const section = query.data?.find((item) => item.slug === slug);

  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <div className="mx-auto max-w-[76rem] px-6 pb-6 sm:px-10 sm:pb-8">
          <div className="flex flex-col-reverse items-start justify-between sm:flex-row sm:gap-4">
            <h1 id="public-policy-title" className="mt-2 min-w-0 max-w-3xl font-heading text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-foreground sm:mt-6 sm:text-5xl">
              {title}
            </h1>
            <Link
              href="/policies"
              className="inline-flex min-h-11 shrink-0 items-start gap-1.5 self-start whitespace-nowrap pt-1 text-md font-semibold tracking-[.04em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mt-6 sm:self-auto"
            >
              <FiArrowLeft className="mt-0.5" aria-hidden="true" />Back to policies
            </Link>
          </div>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground sm:text-lg">{description}</p>
        </div>

        <section className="mx-auto max-w-[76rem] px-6 pb-14 sm:px-10">
          {query.isPending ? (
            <LoadingState message="Loading rules and policies…" />
          ) : query.isError ? (
            <ErrorState title="We couldn't load the policies." onRetry={() => void query.refetch()} />
          ) : !section ? (
            <EmptyState
              title="This policy has not been published yet."
              description="Please contact Dinks on Us directly if you need help with a reservation."
            />
          ) : (
            <article aria-labelledby="public-policy-title">
              {section.subheaders.length === 0 ? (
                <p className="rounded-2xl border border-border bg-card p-5 text-muted-foreground sm:p-8">No details have been added to this policy yet.</p>
              ) : (
                <div className="grid gap-4">
                  {section.subheaders.map((subheader) => (
                    <section key={subheader.id} className="rounded-2xl border border-border bg-card p-5 sm:p-8">
                      <h2 className="font-heading text-lg font-extrabold">{subheader.title}</h2>
                      {subheader.rules.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">No rules have been added to this sub-header yet.</p>
                      ) : (
                        <ul className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground sm:text-base">
                          {subheader.rules.map((rule) => (
                            <li key={rule.id} className="flex gap-3">
                              <FiCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                              <span>{rule.content}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </article>
          )}
        </section>
      </main>
    </PublicSiteFrame>
  );
}
