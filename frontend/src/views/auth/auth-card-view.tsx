import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { siteConfig } from "@/config/site";
export function AuthCardView({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="grid min-h-svh place-items-center bg-muted/30 p-4"><div className="absolute right-4 top-4"><ThemeToggle /></div><Card className="w-full max-w-md"><CardHeader><Link href="/" className="mb-4 text-sm font-semibold">{siteConfig.name}</Link><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card></main>;
}
