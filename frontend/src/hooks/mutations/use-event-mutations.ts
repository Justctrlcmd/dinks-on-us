"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { eventKeys } from "@/config/query-keys";
import { archiveEvent, createEvent, updateEvent } from "@/services/event/event-service";

function useRefreshEvents() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: eventKeys.all });
}

export function useCreateEvent() {
  const refresh = useRefreshEvents();
  return useRateLimitedMutation("event-create", { mutationFn: createEvent, onSuccess: refresh });
}

export function useUpdateEvent() {
  const refresh = useRefreshEvents();
  return useRateLimitedMutation("event-update", { mutationFn: updateEvent, onSuccess: refresh });
}

export function useArchiveEvent() {
  const refresh = useRefreshEvents();
  return useRateLimitedMutation("event-archive", { mutationFn: archiveEvent, onSuccess: refresh });
}
