export interface PolicyRule {
  id: number;
  policy_subheader_id: number;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PolicySubheader {
  id: number;
  policy_section_id: number;
  title: string;
  sort_order: number;
  rules: PolicyRule[];
  created_at: string;
  updated_at: string;
}

export interface PolicySection {
  id: number;
  slug: "court-rules" | "reservation-rules" | "reschedule-policy" | "cancellation-policy";
  name: string;
  sort_order: number;
  subheaders: PolicySubheader[];
  created_at: string;
  updated_at: string;
}

export interface PolicySubheaderInput {
  title: string;
}

export interface PolicyRuleInput {
  policy_subheader_id: number;
  content: string;
}
