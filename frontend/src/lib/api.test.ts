import { beforeEach, describe, expect, it, vi } from "vitest";

describe("API helpers", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

  it("returns a typed successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message: "ok", code: null, data: { status: "ok" }, errors: null, meta: null }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const { publicFetch } = await import("./api");
    await expect(publicFetch<{ status: string }>("/api/v1/health")).resolves.toMatchObject({ data: { status: "ok" } });
  });

  it("normalizes field validation errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, message: "Invalid", code: "VALIDATION_FAILED", data: null, errors: { email: ["Invalid email"] }, meta: null }), { status: 422, headers: { "Content-Type": "application/json" } })));
    const { publicFetch, isApiError } = await import("./api");
    try { await publicFetch("/api/v1/login"); throw new Error("Expected failure"); }
    catch (error) { expect(isApiError(error)).toBe(true); expect(error).toMatchObject({ status: 422, errors: { email: ["Invalid email"] } }); }
  });

  it("handles a no-content response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const { authFetch } = await import("./api");
    await expect(authFetch("/api/v1/example")).resolves.toMatchObject({ success: true, data: null });
  });

  it("normalizes a failed API connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { publicFetch } = await import("./api");
    await expect(publicFetch("/api/v1/health")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("normalizes a failed CSRF initialization", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { publicFetch } = await import("./api");
    await expect(publicFetch("/api/v1/login", { method: "POST", csrf: true })).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });
});
