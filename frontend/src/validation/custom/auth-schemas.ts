import { z } from "zod";
import { ForgotPasswordRequestSchema } from "@/validation/generated/schemas";

const email = z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address."));
const password = z.string().min(8, "The password must contain at least 8 characters.").max(255, "The password must not exceed 255 characters.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password."),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(255),
  email,
  password,
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "The passwords do not match.", path: ["password_confirmation"],
});

export const forgotPasswordSchema = ForgotPasswordRequestSchema.extend({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1), email, password, password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "The passwords do not match.", path: ["password_confirmation"],
});

export const updateProfileSchema = z.object({ name: z.string().trim().min(1).max(255), email });
export const updatePasswordSchema = z.object({
  current_password: z.string().min(1, "Please enter your current password."),
  password,
  password_confirmation: z.string(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "The passwords do not match.", path: ["password_confirmation"],
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;
