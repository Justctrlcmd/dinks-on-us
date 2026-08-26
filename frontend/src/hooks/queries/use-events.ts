"use client";

import { useQuery } from "@tanstack/react-query";
import { eventKeys } from "@/config/query-keys";
import { getManagementEvents, getPublicEvent, getPublicEvents } from "@/services/event/event-service";

export function usePublicEvents(page: number) {
  return useQuery({
    queryKey: eventKeys.publicList(page),
    queryFn: ({ signal }) => getPublicEvents(page, signal),
    staleTime: 60_000,
  });
}

export function usePublicEvent(slug: string) {
  return useQuery({
    queryKey: eventKeys.publicDetail(slug),
    queryFn: ({ signal }) => getPublicEvent(slug, signal).then((response) => response.data),
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
