import "server-only";
import { cookies } from "next/headers";
import type { ApiResponse } from "@/types/api";

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const baseUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("API_URL is not configured.");

  const cookieStore = await cookies();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: init.cache ?? "no-store",
    headers: {
      Accept: "application/json",
      Cookie: cookieStore.toString(),
      ...init.headers,
    },
  });

  if (!response.ok) throw new Error(`Server API request failed with status ${response.status}.`);
  return response.json() as Promise<ApiResponse<T>>;
}
