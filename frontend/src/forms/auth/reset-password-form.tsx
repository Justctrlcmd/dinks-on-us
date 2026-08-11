"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { PasswordInput } from "@/components/common/forms/password-input";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useResetPassword } from "@/hooks/mutations/use-auth-mutations";
import { resetPasswordSchema, type ResetPasswordValues } from "@/validation/custom/auth-schemas";

export function ResetPasswordForm() {
  const params = useSearchParams(); const router = useRouter(); const mutation = useResetPassword(); const [message, setMessage] = useState<string>();
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token: params.get("token") ?? "", email: params.get("email") ?? "", password: "", password_confirmation: "" } });
  const submit = form.handleSubmit(async (values) => { setMessage(undefined); try { await mutation.mutateAsync(values); router.replace("/login?reset=1"); } catch (error) { setMessage(applyApiErrors(error, form.setError)); } });
  return <form onSubmit={submit} className="grid gap-4" noValidate>{message && <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>}
    <InputWithLabel label="Email" type="email" required {...form.register("email")} error={form.formState.errors.email?.message} />
    <PasswordInput label="New password" required {...form.register("password")} error={form.formState.errors.password?.message} />
    <PasswordInput label="Confirm password" required {...form.register("password_confirmation")} error={form.formState.errors.password_confirmation?.message} />
    <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Resetting..." : "Reset password"}</Button>
  </form>;
}
