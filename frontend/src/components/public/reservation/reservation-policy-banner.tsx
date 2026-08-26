"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { FiCheck, FiInfo } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePublicPolicies } from "@/hooks/queries/use-policies";

const policyNavigation = [
  { slug: "reservation-rules", label: "Reservation", title: "Reservation Rules & Policy", description: "Review the current reservation rules before choosing your court time." },
  { slug: "court-rules", label: "Court rules", title: "Court Rules & Policy", description: "Review the current court rules before choosing your court time." },
  { slug: "reschedule-policy", label: "Reschedule", title: "Reschedule Policy", description: "Review the current rescheduling requirements before submitting a request." },
  { slug: "cancellation-policy", label: "Cancellation", title: "Cancellation Policy", description: "Review the current cancellation terms before submitting a reservation." },
] as const;

export type ReservationPolicySlug = (typeof policyNavigation)[number]["slug"];
const usePolicyLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function policyMeta(slug: ReservationPolicySlug) {
  return policyNavigation.find((item) => item.slug === slug) ?? policyNavigation[0];
}

function resetPolicyDialogScroll() {
  const dialog = document.getElementById("reservation-policy-dialog");
  if (dialog) dialog.scrollTop = 0;
}

function ReservationPolicyDialog({ initialSlug }: { initialSlug: ReservationPolicySlug }) {
  const query = usePublicPolicies();
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<ReservationPolicySlug>(initialSlug);
  const activePolicy = query.data?.find((item) => item.slug === activeSlug);
  const activePolicyMeta = policyMeta(activeSlug);
  const relatedPolicies = policyNavigation.filter((item) => item.slug !== activeSlug);

  usePolicyLayoutEffect(() => {
    if (!open) return;
    resetPolicyDialogScroll();
  }, [activeSlug, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="h-9 rounded-full border-primary/40 bg-card px-3 text-xs font-extrabold text-primary hover:border-primary hover:bg-muted sm:h-10 sm:px-4" />}>
        <FiInfo aria-hidden="true" />Review the rules
      </DialogTrigger>
      <DialogContent id="reservation-policy-dialog" className="max-h-[min(42rem,calc(100svh-2rem))] overflow-y-auto p-6 sm:max-w-2xl sm:p-8">
        <DialogHeader className="pr-8 text-left">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-energy">Before you reserve</p>
          <DialogTitle className="font-heading text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">{activePolicy?.name ?? activePolicyMeta.title}</DialogTitle>
          <DialogDescription className="leading-6">{activePolicyMeta.description}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-4">
          {query.isPending ? <p className="text-sm text-muted-foreground">Loading current policy…</p> : query.isError ? <p className="text-sm text-muted-foreground">The {activePolicyMeta.title} could not be loaded. Please visit the Rules &amp; Policies page before submitting.</p> : !activePolicy ? <p className="text-sm text-muted-foreground">The {activePolicyMeta.title} has not been published yet.</p> : activePolicy.subheaders.map((group, index) => (
            <section key={group.id} className="rounded-xl border border-border bg-background p-5" aria-labelledby={`rule-group-${index}`}>
              <h2 id={`rule-group-${index}`} className="font-heading text-base font-extrabold">{group.title}</h2>
              <ul className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground">{group.rules.map((rule) => <li key={rule.id} className="flex gap-3"><FiCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{rule.content}</span></li>)}</ul>
            </section>
          ))}
        </div>
        <nav className="mt-5 flex flex-nowrap justify-center gap-2 overflow-x-auto border-t border-border pt-4" aria-label="Other reservation policies">
          {relatedPolicies.map((policy) => (
            <button key={policy.slug} type="button" onClick={() => setActiveSlug(policy.slug)} aria-label={`Review ${policy.title}`} className="shrink-0 whitespace-nowrap rounded-full border border-primary/30 bg-background px-3 py-2 text-xs font-bold text-primary transition-colors hover:border-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {policy.label}
            </button>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}

export function ReservationPolicyBanner({ initialSlug = "reservation-rules", titleId = "reservation-policy-title", headingLevel = "h2" }: { initialSlug?: ReservationPolicySlug; titleId?: string; headingLevel?: "h1" | "h2" }) {
  const meta = policyMeta(initialSlug);
  const Heading = headingLevel;
  const description = initialSlug === "reservation-rules" ? "Availability and pricing follow the current daily configuration." : "Review the current court rules before completing your reservation.";

  return (
    <section className="rounded-xl border border-primary/30 bg-card px-3 py-2 sm:px-4 sm:py-3" aria-labelledby={titleId}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Heading id={titleId} className="shrink-0 whitespace-nowrap font-heading text-sm font-extrabold tracking-[-.025em] text-primary sm:text-base">{meta.title}</Heading>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">· {description}</span>
        </div>
        <ReservationPolicyDialog initialSlug={initialSlug} />
      </div>
    </section>
  );
}
