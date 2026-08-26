import { authFetch, publicFetch } from "@/lib/api";
import type { GalleryImage, GalleryImageInput, GalleryTab, GalleryTabInput } from "@/types/gallery";

function galleryImageFormData(input: GalleryImageInput) {
  const data = new FormData();
  data.append("gallery_tab_id", String(input.gallery_tab_id));
  data.append("alt_text", input.alt_text);
  if (input.image) data.append("image", input.image);
  return data;
}

export const getPublicGallery = (signal?: AbortSignal) =>
  publicFetch<GalleryTab[]>("/api/v1/public/gallery", { signal });

export const getGalleryTabs = (signal?: AbortSignal) =>
  authFetch<GalleryTab[]>("/api/v1/management/gallery-tabs", { signal });

export const getGalleryImages = (tabId: number, signal?: AbortSignal) =>
  authFetch<GalleryImage[]>(`/api/v1/management/gallery?gallery_tab_id=${tabId}`, { signal });

export const createGalleryTab = (input: GalleryTabInput) =>
  authFetch<GalleryTab>("/api/v1/management/gallery-tabs", {
    method: "POST",
    csrf: true,
    body: JSON.stringify(input),
  });

export const updateGalleryTab = ({ id, input }: { id: number; input: GalleryTabInput }) =>
  authFetch<GalleryTab>(`/api/v1/management/gallery-tabs/${id}`, {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify(input),
  });

export const deleteGalleryTab = (id: number) =>
  authFetch<null>(`/api/v1/management/gallery-tabs/${id}`, {
    method: "DELETE",
    csrf: true,
  });

export const updateGalleryTabOrder = (ids: number[]) =>
  authFetch<GalleryTab[]>("/api/v1/management/gallery-tabs/display-order", {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify({ ids }),
  });

export const createGalleryImage = (input: GalleryImageInput) =>
  authFetch<GalleryImage>("/api/v1/management/gallery", {
    method: "POST",
    csrf: true,
    body: galleryImageFormData(input),
  });

export const updateGalleryImage = ({ id, input }: { id: number; input: GalleryImageInput }) => {
  const data = galleryImageFormData(input);
  data.append("_method", "PATCH");

  return authFetch<GalleryImage>(`/api/v1/management/gallery/${id}`, {
    method: "POST",
    csrf: true,
    body: data,
  });
};

export const deleteGalleryImage = (id: number) =>
  authFetch<null>(`/api/v1/management/gallery/${id}`, {
    method: "DELETE",
    csrf: true,
  });

export const updateGalleryImageOrder = ({ tabId, ids }: { tabId: number; ids: number[] }) =>
  authFetch<GalleryImage[]>(`/api/v1/management/gallery-tabs/${tabId}/image-order`, {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify({ ids }),
  });
