import Link from "next/link";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { siteConfig } from "@/config/site";

export function LandingView() {
  const features = ["Sanctum cookie authentication", "Laravel FormRequests + Zod", "TanStack Query server state", "Neutral light and dark themes", "Responsive authenticated portal"];
  return <div className="min-h-svh"><header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><span className="font-semibold">{siteConfig.name}</span><nav className="flex items-center gap-2"><ThemeToggle /><Button variant="ghost" render={<Link href="/login" />}>Sign in</Button><Button render={<Link href="/register" />}>Get started</Button></nav></header><main className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-[1.2fr_.8fr] lg:items-center"><div><p className="mb-4 text-sm font-medium text-muted-foreground">Reusable application foundation</p><h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">Infrastructure ready for the project you build next.</h1><p className="mt-6 max-w-2xl text-lg text-muted-foreground">Secure authentication, a versioned API, typed frontend communication, reusable forms, and an accessible portal shell—without business assumptions.</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" render={<Link href="/register" />}>Create account <FiArrowRight aria-hidden="true" /></Button><Button size="lg" variant="outline" render={<Link href="/login" />}>Open portal</Button></div></div><div className="rounded-2xl border bg-card p-6 shadow-sm"><h2 className="font-semibold">Foundation included</h2><ul className="mt-5 grid gap-4 text-sm text-muted-foreground">{features.map((item) => <li key={item} className="flex items-center gap-3"><FiCheckCircle className="text-foreground" aria-hidden="true" />{item}</li>)}</ul></div></main></div>;
}
