import { z } from "zod";
import type { AccessModule } from "@/types/api";
import { philippineMobileNumberSchema } from "./contact-number-schema";

export const accessSchema = z.object({
  name: z.string().trim().min(1, "Please enter an Access name.").max(100, "The Access name must not exceed 100 characters."),
  modules: z.array(z.custom<AccessModule>()).min(1, "Select at least one module."),
});
export type AccessValues = z.infer<typeof accessSchema>;

const teamBaseSchema = z.object({
  name: z.string().trim().min(1, "Please enter the Team member's name.").max(150),
  email: z.email("Please enter a valid email address."),
  contact_number: philippineMobileNumberSchema("Enter the contact number."),
  role_id: z.number().int().positive("Select an Access profile."),
  password: z.string().max(255, "The password must not exceed 255 characters."),
  password_confirmation: z.string().max(255),
});
export type TeamValues = z.infer<typeof teamBaseSchema>;

export function teamSchema(requirePassword: boolean) {
  return teamBaseSchema.superRefine((values, context) => {
    if (!requirePassword) return;
    if (values.password.length < 8) {
      context.addIssue({ code: "custom", path: ["password"], message: "The password must contain at least 8 characters." });
    }
    if (values.password !== values.password_confirmation) {
      context.addIssue({ code: "custom", path: ["password_confirmation"], message: "The passwords do not match." });
    }
  });
}

export const resetTeamPasswordSchema = z.object({
  password: z.string().min(8, "The password must contain at least 8 characters.").max(255, "The password must not exceed 255 characters."),
  password_confirmation: z.string().max(255),
}).refine((values) => values.password === values.password_confirmation, {
  path: ["password_confirmation"],
  message: "The passwords do not match.",
});
export type ResetPasswordValues = z.infer<typeof resetTeamPasswordSchema>;
