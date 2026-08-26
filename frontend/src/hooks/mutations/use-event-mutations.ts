"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventKeys } from "@/config/query-keys";
import { archiveEvent, createEvent, updateEvent } from "@/services/event/event-service";

function useRefreshEvents() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: eventKeys.all });
}

export function useCreateEvent() {
  const refresh = useRefreshEvents();
  return useMutation({ mutationFn: createEvent, onSuccess: refresh });
}

export function useUpdateEvent() {
  const refresh = useRefreshEvents();
  return useMutation({ mutationFn: updateEvent, onSuccess: refresh });
}

export function useArchiveEvent() {
  const refresh = useRefreshEvents();
  return useMutation({ mutationFn: archiveEvent, onSuccess: refresh });
}
