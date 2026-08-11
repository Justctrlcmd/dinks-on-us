# Add an authenticated feature

Place backend routes under `auth:sanctum` and add explicit policy/authorization when the domain requires it. Keep 401 distinct from 403. On the frontend, place the page under the portal layout and use authenticated services/query hooks; session expiry is normalized centrally.

Test guest rejection, authorized success, forbidden behavior when applicable, CSRF on writes, and safe errors. Do not introduce browser tokens or localStorage auth. Recheck production domains/cookies when the feature crosses origins.
