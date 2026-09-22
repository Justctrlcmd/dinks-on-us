import { describe, expect, it } from "vitest";
import { loginSchema, updatePasswordSchema } from "./auth-schemas";

describe("authentication schemas", () => {
  it("normalizes email without modifying passwords", () => {
    const result = loginSchema.parse({ email: " USER@EXAMPLE.COM ", password: "  secret  " });
    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("  secret  ");
  });

  it("rejects mismatched password confirmation", () => {
    const result = updatePasswordSchema.safeParse({ current_password: "current-password", password: "password1", password_confirmation: "password2" });
    expect(result.success).toBe(false);
  });
});
