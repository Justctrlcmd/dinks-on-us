# Create a frontend service

Create `services/<domain>/<domain>-service.ts` only for raw API requests. Export named functions such as `getRecords`, `getRecord`, `createRecord`, `updateRecord`, and `deleteRecord`. Use `publicFetch` or `authFetch`, pass `AbortSignal` for reads, and type inputs/responses.

Do not put rendering, modal state, query caching, navigation, or toasts in a service. Those belong in components or query/mutation hooks. Test new error-normalization behavior in the shared API helper rather than duplicating it per service.
