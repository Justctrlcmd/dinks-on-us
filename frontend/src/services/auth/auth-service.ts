import { authFetch, publicFetch } from "@/lib/api";
import type { User } from "@/types/user";

export interface LoginInput { email: string; password: string; remember?: boolean }

export const getCurrentUser = (signal?: AbortSignal) =>
  authFetch<User>("/api/v1/user", { signal });

export const login = (input: LoginInput) =>
  publicFetch<User>("/api/v1/login", { method: "POST", csrf: true, body: JSON.stringify(input) });

export const logout = () =>
  authFetch<null>("/api/v1/logout", { method: "POST", csrf: true });

export const resendVerification = () =>
  authFetch<null>("/api/v1/email/verification-notification", { method: "POST", csrf: true });
