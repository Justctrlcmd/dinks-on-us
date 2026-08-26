"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { galleryKeys } from "@/config/query-keys";
import {
  createGalleryImage,
  createGalleryTab,
  deleteGalleryImage,
  deleteGalleryTab,
  updateGalleryImage,
  updateGalleryImageOrder,
  updateGalleryTab,
  updateGalleryTabOrder,
} from "@/services/gallery/gallery-service";

function useRefreshGallery() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: galleryKeys.all });
}

export function useCreateGalleryTab() {
  const refresh = useRefreshGallery();
  return useMutation({ mutationFn: createGalleryTab, onSuccess: refresh });
}

export function useUpdateGalleryTab() {
  const refresh = useRefreshGallery();
  return useMutation({ mutationFn: updateGalleryTab, onSuccess: refresh });
}

export function useDeleteGalleryTab() {
  const refresh = useRefreshGallery();
  return useMutation({ mutationFn: deleteGalleryTab, onSuccess: refresh });
}

export function useUpdateGalleryTabOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateGalleryTabOrder,
    onSuccess: (response) => {
      client.setQueryData(galleryKeys.tabs(), response.data);
      void client.invalidateQueries({ queryKey: galleryKeys.public() });
    },
  });
}

export function useCreateGalleryImage() {
  const refresh = useRefreshGallery();
  return useMutation({ mutationFn: createGalleryImage, onSuccess: refresh });
}

export function useUpdateGalleryImage() {
  const refresh = useRefreshGallery();
  return useMutation({ mutationFn: updateGalleryImage, onSuccess: refresh });
}

export function useDeleteGalleryImage() {
  const refresh = useRefreshGallery();
  return useMutation({ mutationFn: deleteGalleryImage, onSuccess: refresh });
}

export function useUpdateGalleryImageOrder(tabId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => updateGalleryImageOrder({ tabId, ids }),
    onSuccess: (response) => {
      client.setQueryData(galleryKeys.images(tabId), response.data);
      void client.invalidateQueries({ queryKey: galleryKeys.public() });
    },
  });
}
