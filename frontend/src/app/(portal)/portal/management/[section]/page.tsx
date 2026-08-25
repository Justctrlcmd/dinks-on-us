import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getManagementArea, managementAreas } from "@/config/management";
import { ManagementAreaView } from "@/views/portal/management-area-view";
import { FaqManagementView } from "@/views/portal/faq-management-view";
import { PolicyManagementView } from "@/views/portal/policy-management-view";
import { CourtPricingManagementView } from "@/views/portal/court-pricing-management-view";

export function generateStaticParams() {
  return managementAreas.map(({ slug }) => ({ section: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const area = getManagementArea(section);
  return { title: area?.title ?? "Management" };
}

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const area = getManagementArea(section);

  if (!area) notFound();

  if (area.slug === "faqs") return <FaqManagementView />;
  if (area.slug === "rules-policy") return <PolicyManagementView />;
  if (area.slug === "court-pricing") return <CourtPricingManagementView />;

  return <ManagementAreaView area={area} />;
}
