import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/verify-email", "/portal", "/portal/", "/reserve/checkout"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
