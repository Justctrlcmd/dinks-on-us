import { beforeEach, describe, expect, it, vi } from "vitest";

describe("API helpers", () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks(); });

  it("returns a typed successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message: "ok", code: null, data: { status: "ok" }, errors: null, meta: null }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const { publicFetch } = await import("./api");
    await expect(publicFetch<{ status: string }>("/api/v1/health")).resolves.toMatchObject({ data: { status: "ok" } });
    expect(fetch).toHaveBeenCalledWith("/backend/api/v1/health", expect.objectContaining({ credentials: "include" }));
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

  it("renews expired CSRF once and reuses the same submission and idempotency key", async () => {
    const success = { success: true, message: "ok", data: null, code: null, errors: null, meta: null };
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 419 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(success), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
    const { publicFetch } = await import("./api");
    const body = JSON.stringify({ email: "test@example.com" });
    await expect(publicFetch("/api/v1/example", { method: "POST", csrf: true, body, headers: { "Idempotency-Key": "same-key" } })).resolves.toMatchObject({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(4);
    for (const index of [1, 3]) {
      const options = mockFetch.mock.calls[index][1];
      expect(options.body).toBe(body);
      expect(options.headers.get("Idempotency-Key")).toBe("same-key");
    }
  });

  it("stops after a repeated CSRF rejection and allows future requests to initialize again", async () => {
    vi.stubGlobal("fetch", vi.fn((path: string) => Promise.resolve(path.endsWith("csrf-cookie")
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ success: false, code: "CSRF_TOKEN_MISMATCH" }), { status: 419 }))));
    const { publicFetch } = await import("./api");
    await expect(publicFetch("/api/v1/example", { method: "POST", csrf: true })).rejects.toMatchObject({ status: 419 });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
