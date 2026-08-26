"use client";

import { useQuery } from "@tanstack/react-query";
import { galleryKeys } from "@/config/query-keys";
import { getGalleryImages, getGalleryTabs, getPublicGallery } from "@/services/gallery/gallery-service";

export function usePublicGallery() {
  return useQuery({
    queryKey: galleryKeys.public(),
    queryFn: ({ signal }) => getPublicGallery(signal).then((response) => response.data),
    staleTime: 60_000,
  });
}

export function useGalleryTabs() {
  return useQuery({
    queryKey: galleryKeys.tabs(),
    queryFn: ({ signal }) => getGalleryTabs(signal).then((response) => response.data),
  });
}

export function useGalleryImages(tabId: number | null) {
  return useQuery({
    queryKey: galleryKeys.images(tabId ?? 0),
    queryFn: ({ signal }) => getGalleryImages(tabId!, signal).then((response) => response.data),
    enabled: tabId !== null,
  });
}
