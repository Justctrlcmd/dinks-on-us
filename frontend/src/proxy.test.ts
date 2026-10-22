import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("frontend CSP", () => {
  it("replaces client-supplied nonces and gives rendering and the browser the same strict policy", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("https://courts.example/login", {
      headers: { "x-nonce": "client-controlled", "Content-Security-Policy": "script-src *" },
    });
    const response = proxy(request);
    const policy = response.headers.get("Content-Security-Policy");
    const nonce = policy?.match(/'nonce-([^']+)'/)?.[1];

    expect(nonce).toBeTruthy();
    expect(nonce).not.toBe("client-controlled");
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(proxy(request).headers.get("x-middleware-request-x-nonce")).not.toBe(nonce);
  });

  it("allows uploaded images from only the configured public API origin", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://images.example/api");
    vi.stubEnv("API_URL", "http://internal-api:8000");
    const policy = proxy(new NextRequest("https://courts.example/")).headers.get("Content-Security-Policy");

    expect(policy).toContain("img-src 'self' data: blob: https://images.example;");
    expect(policy).not.toContain("internal-api");
    expect(policy).not.toContain("images.example/api");
    expect(policy).not.toContain("img-src *");
  });

  it("supports the configured server API origin when there is no public API setting", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    vi.stubEnv("API_URL", "http://127.0.0.1:8000");
    const policy = proxy(new NextRequest("http://localhost:3000/")).headers.get("Content-Security-Policy");

    expect(policy).toContain("img-src 'self' data: blob: http://127.0.0.1:8000;");
  });
});
