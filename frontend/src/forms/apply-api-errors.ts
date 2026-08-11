import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api";

export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): string {
  if (!isApiError(error)) return "Something went wrong. Please try again.";
  for (const [field, messages] of Object.entries(error.errors ?? {})) {
    setError(field as Path<T>, { type: "server", message: messages[0] });
  }
  return error.message;
}
