import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPolicy, publicPolicies } from "@/config/public-policies";
import { PolicyPageView } from "@/views/public/policy-page-view";

export function generateStaticParams() {
  return publicPolicies.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = getPublicPolicy(slug);

  return { title: policy?.title ?? "Policy" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = getPublicPolicy(slug);

  if (!policy) notFound();

  return <PolicyPageView {...policy} />;
}
