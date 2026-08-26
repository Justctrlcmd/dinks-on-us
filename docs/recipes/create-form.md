# Create a form

Identify the domain and inspect common controls first. Put a complete form in `forms/<domain>`. When backend input exists, create a FormRequest, decide normalization per field, and use validated data. Generate Zod only for supported rules; use a custom schema for passwords or refinements. Never modify passwords or tokens.

Use React Hook Form, reusable controls, a service request, and a mutation hook. Do not map Laravel 422 responses into dialog fields; only Zod validation belongs beneath those controls. Do not fetch or render toasts inside services. API mutation results are toasted automatically by the shared query provider, so do not duplicate success, error, warning, or informational messages inside the form. Test client validation, safe server errors, loading/disabled behavior, and success.
