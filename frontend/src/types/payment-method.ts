export interface PaymentMethod {
  id: number;
  name: string;
  qr_image_url: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodInput {
  name: string;
  account_name: string;
  account_number: string;
  qr_image?: File;
}

export type PublicPaymentMethod = Pick<
  PaymentMethod,
  "id" | "name" | "qr_image_url" | "account_name" | "account_number"
>;
