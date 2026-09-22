import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

type PublicMetadataOptions = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  publishedTime?: string | null;
};

export function publicMetadata({ title, description, path, type = "website", publishedTime }: PublicMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      title: `${title} · ${siteConfig.name}`,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteConfig.name }],
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${siteConfig.name}`,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export function seoDescription(value: string, maxLength = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}
