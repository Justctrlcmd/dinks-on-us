import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = "Dinks on Us pickleball court reservations in Bulacan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "linear-gradient(135deg, #123e4d 0%, #1e6f78 62%, #b53a6d 100%)", color: "#fffdfc", display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", padding: "72px", width: "100%" }}>
      <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pickleball in Bulacan</div>
      <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: "-0.06em", marginTop: 24 }}>{siteConfig.name}</div>
      <div style={{ fontSize: 38, marginTop: 34, opacity: 0.9 }}>{siteConfig.description}</div>
    </div>,
    size,
  );
}
