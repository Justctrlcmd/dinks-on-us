// AUTO-GENERATED FILE.
// DO NOT EDIT MANUALLY. Run `composer schemas:generate` in backend/.

import { z } from 'zod';

export const ForgotPasswordRequestSchema = z.object({
    email: z.email({ error: 'The email field must be a valid email address.' }).trim().min(1, 'The email field is required.'),
});
export type ForgotPasswordRequestSchemaType = z.infer<typeof ForgotPasswordRequestSchema>;

