import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailView } from "@/views/public/event-detail-view";
import { publicServerFetch, ServerApiError } from "@/lib/server-api";
import { publicMetadata, seoDescription } from "@/lib/seo";
import type { EventRecord } from "@/types/event";

async function getEvent(slug: string): Promise<EventRecord | undefined> {
  try {
    return (await publicServerFetch<EventRecord>(`/api/v1/public/events/${encodeURIComponent(slug)}`)).data;
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    return undefined;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return publicMetadata({ title: "Event Details", description: "Read the latest announcement from Dinks on Us.", path: `/events/${slug}` });
  }

  return publicMetadata({
    title: event.header,
    description: seoDescription(event.description),
    path: `/events/${event.slug}`,
    type: "article",
    publishedTime: event.published_at,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const initialEvent = await getEvent(slug);
  return <EventDetailView slug={slug} initialEvent={initialEvent} />;
}
