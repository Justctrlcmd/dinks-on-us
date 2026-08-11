import { authFetch } from "@/lib/api";
import type { User } from "@/types/user";

export interface UpdateProfileInput { name: string; email: string }
export interface UpdatePasswordInput { current_password: string; password: string; password_confirmation: string }

export const getProfile = (signal?: AbortSignal) => authFetch<User>("/api/v1/profile", { signal });
export const updateProfile = (input: UpdateProfileInput) => authFetch<User>("/api/v1/profile", {
  method: "PATCH", csrf: true, body: JSON.stringify(input),
});
export const updatePassword = (input: UpdatePasswordInput) => authFetch<null>("/api/v1/password", {
  method: "PUT", csrf: true, body: JSON.stringify(input),
});
