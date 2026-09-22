import type { MetadataRoute } from "next";
import { publicPolicies } from "@/config/public-policies";
import { siteConfig } from "@/config/site";
import { publicServerFetch } from "@/lib/server-api";
import type { EventRecord } from "@/types/event";

const staticPaths = ["/", "/reserve", "/events", "/faq", "/policies", ...publicPolicies.map(({ slug }) => `/policies/${slug}`)];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({ url: `${siteConfig.url}${path}` }));

  try {
    const firstPage = await publicServerFetch<EventRecord[]>("/api/v1/public/events?page=1&per_page=100");
    const events = [...firstPage.data];

    for (let page = 2; page <= (firstPage.meta?.last_page ?? 1); page += 1) {
      const response = await publicServerFetch<EventRecord[]>(`/api/v1/public/events?page=${page}&per_page=100`);
      events.push(...response.data);
    }

    return [...entries, ...events.map((event) => ({ url: `${siteConfig.url}/events/${event.slug}`, lastModified: new Date(event.updated_at) }))];
  } catch {
    return entries;
  }
}
