"use client";

import { useQuery } from "@tanstack/react-query";
import { eventKeys } from "@/config/query-keys";
import { getManagementEvents, getPublicEvent, getPublicEvents } from "@/services/event/event-service";
import type { EventRecord, PaginatedEvents } from "@/types/event";

export function usePublicEvents(page: number, initialData?: PaginatedEvents) {
  return useQuery({
    queryKey: eventKeys.publicList(page),
    queryFn: ({ signal }) => getPublicEvents(page, signal),
    initialData: page === 1 ? initialData : undefined,
    staleTime: 60_000,
  });
}

export function usePublicEvent(slug: string, initialData?: EventRecord) {
  return useQuery({
    queryKey: eventKeys.publicDetail(slug),
    queryFn: ({ signal }) => getPublicEvent(slug, signal).then((response) => response.data),
    initialData,
    staleTime: 60_000,
    retry: false,
  });
}

export function useManagementEvents(page: number) {
  return useQuery({
    queryKey: eventKeys.management(page),
    queryFn: ({ signal }) => getManagementEvents(page, signal),
  });
}
