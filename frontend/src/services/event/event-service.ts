import { authFetch, publicFetch } from "@/lib/api";
import type { EventInput, EventRecord, PaginatedEvents } from "@/types/event";

function eventFormData(input: EventInput) {
  const data = new FormData();
  data.append("header", input.header);
  data.append("description", input.description);
  data.append("event_date", input.event_date);
  if (input.image) data.append("image", input.image);
  return data;
}

export async function getPublicEvents(page: number, signal?: AbortSignal): Promise<PaginatedEvents> {
  const response = await publicFetch<EventRecord[]>(`/api/v1/public/events?page=${page}`, { signal });
  return { data: response.data, meta: response.meta! };
}

export const getPublicEvent = (slug: string, signal?: AbortSignal) =>
  publicFetch<EventRecord>(`/api/v1/public/events/${encodeURIComponent(slug)}`, { signal });

export async function getManagementEvents(page: number, signal?: AbortSignal): Promise<PaginatedEvents> {
  const response = await authFetch<EventRecord[]>(`/api/v1/management/events?page=${page}`, { signal });
  return { data: response.data, meta: response.meta! };
}

export const createEvent = (input: EventInput) =>
  authFetch<EventRecord>("/api/v1/management/events", {
    method: "POST",
    csrf: true,
    body: eventFormData(input),
  });

export const updateEvent = ({ id, input }: { id: number; input: EventInput }) => {
  const data = eventFormData(input);
  data.append("_method", "PATCH");

  return authFetch<EventRecord>(`/api/v1/management/events/${id}`, {
    method: "POST",
    csrf: true,
    body: data,
  });
};

export const archiveEvent = (id: number) =>
  authFetch<null>(`/api/v1/management/events/${id}`, {
    method: "DELETE",
    csrf: true,
  });
