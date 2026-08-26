import { describe, expect, it } from "vitest";
import { accessSchema, teamSchema } from "./team-access-schema";

describe("Team & Access validation", () => {
  it("requires exact Philippine mobile format", () => {
    const schema = teamSchema(true);
    const base = { name: "Ana", email: "ana@example.com", role_id: 2, password: "password123", password_confirmation: "password123" };
    expect(schema.safeParse({ ...base, contact_number: "09123456789" }).success).toBe(true);
    expect(schema.safeParse({ ...base, contact_number: "+639123456789" }).success).toBe(false);
    expect(schema.safeParse({ ...base, contact_number: "0912345678" }).success).toBe(false);
  });

  it("requires at least one Access module", () => {
    expect(accessSchema.safeParse({ name: "Front Desk", modules: [] }).success).toBe(false);
  });
});
