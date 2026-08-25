import { authFetch, publicFetch } from "@/lib/api";
import type { Faq, FaqInput } from "@/types/faq";

export const getPublicFaqs = (signal?: AbortSignal) =>
  publicFetch<Faq[]>("/api/v1/public/faqs", { signal });

export const getManagementFaqs = (signal?: AbortSignal) =>
  authFetch<Faq[]>("/api/v1/management/faqs", { signal });

export const createFaq = (input: FaqInput) =>
  authFetch<Faq>("/api/v1/management/faqs", {
    method: "POST",
    csrf: true,
    body: JSON.stringify(input),
  });

export const updateFaq = ({ id, input }: { id: number; input: FaqInput }) =>
  authFetch<Faq>(`/api/v1/management/faqs/${id}`, {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify(input),
  });

export const deleteFaq = (id: number) =>
  authFetch<null>(`/api/v1/management/faqs/${id}`, {
    method: "DELETE",
    csrf: true,
  });

export const updateFaqOrder = (ids: number[]) =>
  authFetch<Faq[]>("/api/v1/management/faqs/display-order", {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify({ ids }),
  });
