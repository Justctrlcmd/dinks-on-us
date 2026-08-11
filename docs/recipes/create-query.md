# Create a query

Add a hierarchical key factory in `config/query-keys.ts`; include normalized filters in list keys. Put reads in `hooks/queries` and writes/actions in `hooks/mutations`. Query functions call services and forward abort signals.

Choose stale time, retry, invalidation, and optimistic updates from actual UX and conflict risk. Update or invalidate the narrowest keys after mutation. Never copy query results into Zustand or component-level shadow caches.
