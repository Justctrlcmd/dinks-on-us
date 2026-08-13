import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export function AuthCardView({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-brand-surface px-4 py-5 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full border-[4rem] border-white/4" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-112 rounded-full border-[5rem] border-white/3" aria-hidden="true" />
      <ThemeToggle className="absolute right-5 top-5 z-10 size-10 rounded-full border border-white/15 bg-black/10 text-white hover:bg-white/10 hover:text-white sm:right-7 sm:top-7" />

      <Card className="relative w-full max-w-md rounded-3xl border-0 bg-card py-0 shadow-2xl shadow-black/20 ring-0">
        <CardHeader className="gap-0 px-6 pb-6 pt-8 text-center sm:px-10 sm:pt-9">
          <div className="flex justify-center">
            <Link
              href="/"
              className="flex w-fit flex-col items-center rounded-xl focus-visible:outline-offset-4"
              aria-label={`${siteConfig.name} home`}
            >
              <Image
                src="/images/dinks-on-us-logo.png"
                alt=""
                width={68}
                height={43}
                className="h-auto w-15 rounded-lg object-contain"
                aria-hidden="true"
              />
              <span className="mt-2 font-heading text-xl font-extrabold tracking-[-0.04em] text-foreground">
                {siteConfig.name}
              </span>
            </Link>
          </div>
          <CardTitle className="mt-5 font-heading text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
            {title}
          </CardTitle>
          <CardDescription className="mx-auto mt-2 max-w-sm text-sm leading-5 sm:text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 sm:px-10 sm:pb-9">{children}</CardContent>
      </Card>
    </main>
  );
}
