import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getManagementArea, managementAreas } from "@/config/management";
import { ManagementAreaView } from "@/views/portal/management-area-view";

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

  return <ManagementAreaView area={area} />;
}
