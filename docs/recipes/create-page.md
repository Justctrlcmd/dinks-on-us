# Create a page

Put routing, metadata, loading, and error boundaries in `frontend/src/app`. Put the complete implementation in `src/views/<area>`. Keep `page.tsx` as a small import and return. Reuse the portal shell for authenticated pages and existing common states/components before adding abstractions.

Determine whether data belongs in a Server Component through `server-api.ts` or in a client query hook. Preserve keyboard navigation, responsive behavior, headings, loading/error/empty states, and semantic tokens.
