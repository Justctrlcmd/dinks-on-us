import "server-only";
import { cookies } from "next/headers";
import type { ApiResponse } from "@/types/api";

export class ServerApiError extends Error {
  constructor(public readonly status: number) {
    super(`Server API request failed with status ${status}.`);
    this.name = "ServerApiError";
  }
}

function apiBaseUrl(): string {
  const baseUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("API_URL is not configured.");

  return baseUrl;
}

async function requestFromServer<T>(path: string, init: RequestInit, cookie: string | null): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (cookie) headers.set("Cookie", cookie);

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    cache: init.cache ?? "no-store",
    headers,
  });

  if (!response.ok) throw new ServerApiError(response.status);
  return response.json() as Promise<ApiResponse<T>>;
}

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  return requestFromServer<T>(path, init, cookieStore.toString());
}

export function publicServerFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  return requestFromServer<T>(path, init, null);
}
