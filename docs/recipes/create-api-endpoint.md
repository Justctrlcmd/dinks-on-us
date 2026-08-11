# Create an API endpoint

Default flow: versioned route → FormRequest when input exists → focused controller → action/service only when complexity warrants it → model/transaction → API Resource → `ApiResponse` envelope. Simple CRUD does not need every layer.

Choose the correct status code, authentication/authorization, throttling, eager loading, and transaction boundary. Return only safe messages. Add feature tests for success, invalid input, guest/forbidden behavior, resource shape, and relevant conflicts.
