import type { Metadata } from "next";
import { EventsView } from "@/views/public/events-view";
import { publicServerFetch } from "@/lib/server-api";
import { publicMetadata } from "@/lib/seo";
import type { EventRecord, PaginatedEvents } from "@/types/event";

export const metadata: Metadata = publicMetadata({
  title: "Pickleball Events & Announcements",
  description: "Explore upcoming pickleball events, activities, and announcements from Dinks on Us in Bulacan.",
  path: "/events",
});

export default async function Page() {
  const initialEvents = await publicServerFetch<EventRecord[]>("/api/v1/public/events?page=1")
    .then((response): PaginatedEvents | undefined => response.meta ? { data: response.data, meta: response.meta } : undefined)
    .catch(() => undefined);

  return <EventsView initialEvents={initialEvents} />;
}
