import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body className="min-h-svh antialiased"><AppProviders>{children}</AppProviders></body></html>;
}
