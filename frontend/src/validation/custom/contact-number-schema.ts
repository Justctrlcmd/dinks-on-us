import { z } from "zod";

export const PHILIPPINE_MOBILE_NUMBER_PATTERN = /^09[0-9]{9}$/;
export const PHILIPPINE_MOBILE_NUMBER_MESSAGE = "Use exactly 11 digits starting with 09.";

export function philippineMobileNumberSchema(requiredMessage: string) {
  return z.string().trim().min(1, requiredMessage).refine(
    (value) => value.length === 0 || PHILIPPINE_MOBILE_NUMBER_PATTERN.test(value),
    PHILIPPINE_MOBILE_NUMBER_MESSAGE,
  );
}
