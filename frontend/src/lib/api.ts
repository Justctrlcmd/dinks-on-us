import type { ApiError, ApiResponse } from "@/types/api";

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
let csrfRequest: Promise<void> | null = null;

export class NormalizedApiError extends Error implements ApiError {
  status: number;
  code: string | null;
  errors?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "NormalizedApiError";
    this.status = error.status;
    this.code = error.code;
    this.errors = error.errors;
  }
}

export interface ApiFetchOptions extends RequestInit {
  csrf?: boolean;
}

function getApiUrl(path: string): string {
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  return `${apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function cookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  return document.cookie.split("; ").find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

async function ensureCsrfCookie(signal?: AbortSignal): Promise<void> {
  if (!csrfRequest) {
    csrfRequest = fetch(getApiUrl("/sanctum/csrf-cookie"), {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal,
    }).then((response) => {
      if (!response.ok) throw new Error("Unable to initialize a secure session.");
    }).catch((error) => {
      csrfRequest = null;
      throw error;
    });
  }
  return csrfRequest;
}

async function request<T>(path: string, options: ApiFetchOptions = {}): Promise<ApiResponse<T>> {
  const { csrf = false, headers: providedHeaders, ...init } = options;
  if (csrf) await ensureCsrfCookie(init.signal ?? undefined);

  const headers = new Headers(providedHeaders);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (csrf) {
    const token = cookie("XSRF-TOKEN");
    if (token) headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
  }

  let response: Response;
  try {
    response = await fetch(getApiUrl(path), { ...init, credentials: "include", headers });
  } catch (cause) {
    throw new NormalizedApiError({
      status: 0,
      message: cause instanceof DOMException && cause.name === "AbortError"
        ? "The request was cancelled."
        : "We couldn't connect to the service. Check your connection and try again.",
      code: "NETWORK_ERROR",
    });
  }

  if (response.status === 204) {
    return { success: true, message: "", code: null, data: null as T, errors: null, meta: null };
  }

  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || !payload?.success) {
    const error = new NormalizedApiError({
      status: response.status,
      message: payload?.message ?? "Something went wrong while processing your request.",
      code: payload?.code ?? "REQUEST_FAILED",
      errors: payload?.errors ?? undefined,
    });
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    throw error;
  }
  return payload;
}

export function publicFetch<T>(path: string, options?: ApiFetchOptions) {
  return request<T>(path, options);
}

export function authFetch<T>(path: string, options?: ApiFetchOptions) {
  return request<T>(path, options);
}

export function isApiError(error: unknown): error is NormalizedApiError {
  return error instanceof NormalizedApiError;
}
