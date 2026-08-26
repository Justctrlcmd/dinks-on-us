import type { Metadata } from "next";
import { EventDetailView } from "@/views/public/event-detail-view";

export const metadata: Metadata = { title: "Event Details" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventDetailView slug={slug} />;
}
