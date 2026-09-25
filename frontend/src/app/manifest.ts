import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.name,
    short_name: "Dinks on Us",
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f3e9",
    theme_color: "#174e56",
    icons: [
      { src: "/dinks-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/dinks-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/dinks-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
