import type { Metadata } from "next";
import { FaqView } from "@/views/public/faq-view";
import { publicServerFetch } from "@/lib/server-api";
import { publicMetadata } from "@/lib/seo";
import type { Faq } from "@/types/faq";

export const metadata: Metadata = publicMetadata({
  title: "Pickleball Reservation FAQs",
  description: "Find answers about court reservations, payments, court time, and visiting Dinks on Us in Bulacan.",
  path: "/faq",
});

export default async function Page() {
  const initialFaqs = await publicServerFetch<Faq[]>("/api/v1/public/faqs").then((response) => response.data).catch(() => undefined);
  return <FaqView initialFaqs={initialFaqs} />;
}
