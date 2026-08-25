import { z } from "zod";

export const faqSchema = z.object({
  question: z.string().trim().min(1, "Enter the FAQ question.").max(500, "Keep the question under 500 characters."),
  answer: z.string().trim().min(1, "Enter the FAQ answer.").max(5000, "Keep the answer under 5,000 characters."),
});

export type FaqValues = z.infer<typeof faqSchema>;
