import type { PolicySection } from "@/types/policy";

export const publicPolicies = [
  {
    slug: "court-rules",
    title: "Court Rules & Policy",
    description: "Know the expectations for court time, player conduct, equipment, and the facility.",
  },
  {
    slug: "reservation-rules",
    title: "Reservation Rules & Policy",
    description: "Review how reservations, payment verification, and booking confirmations work.",
  },
  {
    slug: "reschedule-policy",
    title: "Reschedule Policy",
    description: "Understand when a confirmed reservation may be moved and how Force Majeure circumstances are handled.",
  },
  {
    slug: "cancellation-policy",
    title: "Cancellation Policy",
    description: "Review the terms that apply if a confirmed reservation can no longer proceed.",
  },
] as const satisfies readonly {
  slug: PolicySection["slug"];
  title: string;
  description: string;
}[];

export function getPublicPolicy(slug: string) {
  return publicPolicies.find((policy) => policy.slug === slug);
}
