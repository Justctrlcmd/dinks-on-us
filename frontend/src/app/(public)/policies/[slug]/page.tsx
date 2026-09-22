import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPolicy, publicPolicies } from "@/config/public-policies";
import { publicServerFetch } from "@/lib/server-api";
import { publicMetadata } from "@/lib/seo";
import type { PolicySection } from "@/types/policy";
import { PolicyPageView } from "@/views/public/policy-page-view";

export function generateStaticParams() {
  return publicPolicies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPublicPolicy(slug);

  return publicMetadata({
    title: policy?.title ?? "Policy",
    description: policy?.description ?? "Read Dinks on Us policies and booking information.",
    path: `/policies/${slug}`,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = getPublicPolicy(slug);

  if (!policy) notFound();

  const initialPolicies = await publicServerFetch<PolicySection[]>("/api/v1/public/policies").then((response) => response.data).catch(() => undefined);
  return <PolicyPageView {...policy} initialPolicies={initialPolicies} />;
}
