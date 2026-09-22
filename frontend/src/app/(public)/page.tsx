import type { Metadata } from "next";
import { LandingView } from "@/views/public/landing-view";
import { publicServerFetch } from "@/lib/server-api";
import { publicMetadata } from "@/lib/seo";
import type { GalleryTab } from "@/types/gallery";

export const metadata: Metadata = publicMetadata({
  title: "Pickleball Court Reservations in Bulacan",
  description: "Reserve a pickleball court at Dinks on Us in Angat, Bulacan. Check court availability, events, rules, and booking information.",
  path: "/",
});

export default async function Page() {
  const initialGallery = await publicServerFetch<GalleryTab[]>("/api/v1/public/gallery").then((response) => response.data).catch(() => undefined);
  return <LandingView initialGallery={initialGallery} />;
}
