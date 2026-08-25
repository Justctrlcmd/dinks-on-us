import { z } from "zod";

export const policySubheaderSchema = z.object({
  title: z.string().trim().min(1, "Enter the sub-header name.").max(255, "Keep the sub-header under 255 characters."),
});

export const policyRuleSchema = z.object({
  policy_subheader_id: z.number().int().positive("Choose a sub-header."),
  content: z.string().trim().min(1, "Enter the policy rule.").max(5000, "Keep the rule under 5,000 characters."),
});

export type PolicySubheaderValues = z.infer<typeof policySubheaderSchema>;
export type PolicyRuleValues = z.infer<typeof policyRuleSchema>;
