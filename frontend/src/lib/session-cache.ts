import type { QueryClient } from "@tanstack/react-query";

export async function clearSessionCache(client: QueryClient) {
  // Cancel first so a late response from the previous user cannot refill caches.
  await client.cancelQueries();
  client.clear();
}

export async function clearExpiredSessionCache(client: QueryClient) {
  // Keep the current-session query's 401 so mounted auth boundaries can react.
  const filters = { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== "auth" };
  await client.cancelQueries(filters);
  client.removeQueries(filters);
  client.getMutationCache().clear();
}
