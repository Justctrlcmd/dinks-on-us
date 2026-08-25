"use client";

import { FiCheck } from "react-icons/fi";
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

export function PolicyPageView({ title, description, slug }: PolicyPageViewProps) {
  const query = usePublicPolicies();
  const section = query.data?.find((item) => item.slug === slug);

  return (
    <PublicSiteFrame>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <div className="mx-auto max-w-[76rem] px-6 pb-10 sm:px-10 sm:pb-12">
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground sm:text-lg">{description}</p>
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
            <article aria-labelledby={`public-policy-${section.id}`} className="rounded-2xl border border-border bg-card p-5 sm:p-8">
              <h2 id={`public-policy-${section.id}`} className="font-heading text-2xl font-extrabold tracking-[-.035em] sm:text-3xl">
                {section.name}
              </h2>
              {section.subheaders.length === 0 ? (
                <p className="mt-4 text-muted-foreground">No details have been added to this policy yet.</p>
              ) : (
                <div className="mt-7 grid gap-7">
                  {section.subheaders.map((subheader) => (
                    <section key={subheader.id}>
                      <h3 className="font-heading text-lg font-extrabold">{subheader.title}</h3>
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
