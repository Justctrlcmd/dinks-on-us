export interface Faq {
  id: number;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaqInput {
  question: string;
  answer: string;
}
