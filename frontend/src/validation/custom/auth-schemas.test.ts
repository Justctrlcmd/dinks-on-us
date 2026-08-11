import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth-schemas";

describe("authentication schemas", () => {
  it("normalizes email without modifying passwords", () => {
    const result = loginSchema.parse({ email: " USER@EXAMPLE.COM ", password: "  secret  " });
    expect(result.email).toBe("user@example.com");
    expect(result.password).toBe("  secret  ");
  });

  it("rejects mismatched password confirmation", () => {
    const result = registerSchema.safeParse({ name: "Jane", email: "jane@example.com", password: "password1", password_confirmation: "password2" });
    expect(result.success).toBe(false);
  });
});
