import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { publicServerFetch } from "@/lib/server-api";
import type { EventRecord } from "@/types/event";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await publicServerFetch<EventRecord>(`/api/v1/public/events/${encodeURIComponent(slug)}`)
    .then((response) => response.data)
    .catch(() => undefined);
  const title = event?.header ?? "Dinks on Us Event";
  const date = event?.event_date ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(new Date(`${event.event_date}T00:00:00+08:00`)) : "Pickleball in Bulacan";

  return new ImageResponse(
    <div style={{ alignItems: "flex-start", background: "linear-gradient(135deg, #123e4d 0%, #1e6f78 62%, #b53a6d 100%)", color: "#fffdfc", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: "72px", width: "100%" }}>
      <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{date}</div>
      <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 1.05, maxWidth: "100%" }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 700 }}>{siteConfig.name}</div>
    </div>,
    size,
  );
}
