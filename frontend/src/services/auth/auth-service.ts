import { authFetch, publicFetch } from "@/lib/api";
import type { User } from "@/types/user";

export interface LoginInput { email: string; password: string; remember?: boolean }
export interface RegisterInput { name: string; email: string; password: string; password_confirmation: string }
export interface ResetPasswordInput { token: string; email: string; password: string; password_confirmation: string }

export const getCurrentUser = (signal?: AbortSignal) =>
  authFetch<User>("/api/v1/user", { signal });

export const login = (input: LoginInput) =>
  publicFetch<User>("/api/v1/login", { method: "POST", csrf: true, body: JSON.stringify(input) });

export const register = (input: RegisterInput) =>
  publicFetch<User>("/api/v1/register", { method: "POST", csrf: true, body: JSON.stringify(input) });

export const logout = () =>
  authFetch<null>("/api/v1/logout", { method: "POST", csrf: true });

export const forgotPassword = (email: string) =>
  publicFetch<null>("/api/v1/forgot-password", { method: "POST", csrf: true, body: JSON.stringify({ email }) });

export const resetPassword = (input: ResetPasswordInput) =>
  publicFetch<null>("/api/v1/reset-password", { method: "POST", csrf: true, body: JSON.stringify(input) });

export const resendVerification = () =>
  authFetch<null>("/api/v1/email/verification-notification", { method: "POST", csrf: true });
