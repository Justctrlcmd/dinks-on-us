# Create a form

Identify the domain and inspect common controls first. Put a complete form in `forms/<domain>`. When backend input exists, create a FormRequest, decide normalization per field, and use validated data. Generate Zod only for supported rules; use a custom schema for passwords or refinements. Never modify passwords or tokens.

Use React Hook Form, reusable controls, a service request, and a mutation hook. Map Laravel 422 errors with `applyApiErrors`; do not fetch or render toasts inside services. Test client validation, safe server errors, loading/disabled behavior, and success.
