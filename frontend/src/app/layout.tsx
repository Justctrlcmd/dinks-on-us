import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LocalBusinessJsonLd } from "@/components/public/local-business-json-ld";
import { siteConfig } from "@/config/site";
import { AppProviders } from "@/providers/app-providers";

// CSP nonces are request-specific, so pages must render with the nonce supplied by proxy.ts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  category: "sports",
  keywords: ["pickleball", "pickleball court", "pickleball Bulacan", "court reservation", "Angat"],
  openGraph: { siteName: siteConfig.name, locale: siteConfig.locale, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteConfig.name }] },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  themeColor: "#174e56",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-PH" suppressHydrationWarning><body className="min-h-svh antialiased"><LocalBusinessJsonLd /><AppProviders>{children}</AppProviders></body></html>;
}
