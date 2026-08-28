"use client";

import { useState } from "react";
import { FiImage } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { mockPublicSite } from "@/config/mock-public-site";
import { usePublicGallery } from "@/hooks/queries/use-gallery";
import { cn } from "@/lib/utils";

export function LandingGallerySection() {
  const query = usePublicGallery();
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const tabs = query.data ?? [];
  const activeTabId = tabs.some(({ id }) => id === selectedTabId) ? selectedTabId : tabs[0]?.id ?? null;
  const selectedTab = tabs.find(({ id }) => id === activeTabId) ?? null;
  const images = selectedTab?.images ?? [];

  return (
    <section id="gallery" className="border-y border-border bg-card py-20 sm:py-28">
      <div className="mx-auto max-w-[96rem] px-6 sm:px-10 lg:px-30">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-foreground">
            <span className="h-5 w-px bg-foreground" aria-hidden="true" />
            {mockPublicSite.gallery.eyebrow}
          </p>
          <h2 className="mt-4 font-heading text-4xl font-extrabold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-5xl">
            {mockPublicSite.gallery.title}
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">{mockPublicSite.gallery.description}</p>
        </div>

        {query.isPending ? (
          <div className="mt-6" aria-label="Loading gallery">
            <div className="flex gap-2" aria-hidden="true">
              <Skeleton className="h-11 w-28 rounded-full" />
              <Skeleton className="h-11 w-32 rounded-full" />
              <Skeleton className="h-11 w-24 rounded-full" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              <Skeleton className="aspect-[4/3] rounded-2xl" />
              <Skeleton className="aspect-[4/3] rounded-2xl" />
              <Skeleton className="aspect-[4/3] rounded-2xl" />
            </div>
          </div>
        ) : query.isError ? (
          <div className="mt-6 rounded-2xl border border-dashed p-6 text-center">
            <p className="font-semibold">The gallery could not be loaded.</p>
            <p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>
            <Button variant="outline" className="mt-4" onClick={() => void query.refetch()}>Try again</Button>
          </div>
        ) : !query.data || query.data.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed p-8 text-center">
            <FiImage className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-semibold">Gallery images are coming soon.</p>
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Gallery categories" className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {query.data.map((tab) => (
                <button
                  key={tab.id}
                  id={`public-gallery-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab.id === activeTabId}
                  aria-controls="public-gallery-panel"
                  className={cn(
                    "min-h-11 shrink-0 rounded-full border px-5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-base",
                    tab.id === activeTabId
                      ? "border-energy bg-energy text-energy-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/45 hover:bg-accent",
                  )}
                  onClick={() => setSelectedTabId(tab.id)}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div id="public-gallery-panel" role="tabpanel" aria-labelledby={selectedTab ? `public-gallery-tab-${selectedTab.id}` : undefined}>
              {images.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No images have been added to {selectedTab?.name} yet.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {images.map((image) => (
                    <figure key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted">
                      {/* Public gallery assets are served from the configured API storage host. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.image_url} alt={image.alt_text} className="size-full object-cover" loading="lazy" />
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
