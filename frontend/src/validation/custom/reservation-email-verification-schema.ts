import { z } from "zod";

export const reservationEmailSchema = z.email("Enter a valid email address.").trim().max(180, "Keep your email under 180 characters.");
export const reservationEmailCodeSchema = z.object({ code: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit verification code.") });
