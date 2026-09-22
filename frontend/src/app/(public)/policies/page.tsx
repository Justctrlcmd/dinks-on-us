import type { Metadata } from "next";
import { PoliciesView } from "@/views/public/policies-view";
import { publicServerFetch } from "@/lib/server-api";
import { publicMetadata } from "@/lib/seo";
import type { PolicySection } from "@/types/policy";

export const metadata: Metadata = publicMetadata({
  title: "Pickleball Rules & Policies",
  description: "Review Dinks on Us court rules, reservation rules, rescheduling, and cancellation policies before you book.",
  path: "/policies",
});

export default async function Page() {
  const initialPolicies = await publicServerFetch<PolicySection[]>("/api/v1/public/policies").then((response) => response.data).catch(() => undefined);
  return <PoliciesView initialPolicies={initialPolicies} />;
}
