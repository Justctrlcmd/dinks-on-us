"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { PasswordInput } from "@/components/common/forms/password-input";
import { useResetPassword } from "@/hooks/mutations/use-auth-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import { resetPasswordSchema, type ResetPasswordValues } from "@/validation/custom/auth-schemas";

export function ResetPasswordForm() {
  const params = useSearchParams(); const router = useRouter(); const mutation = useResetPassword();
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token: params.get("token") ?? "", email: params.get("email") ?? "", password: "", password_confirmation: "" } });
  const submit = form.handleSubmit(async (values) => { try { await mutation.mutateAsync(values); router.replace("/login?reset=1"); } catch {} });
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <InputWithLabel label="Email" type="email" required {...form.register("email")} error={form.formState.errors.email?.message} />
    <PasswordInput label="New password" required {...form.register("password")} error={form.formState.errors.password?.message} />
    <PasswordInput label="Confirm password" required {...form.register("password_confirmation")} error={form.formState.errors.password_confirmation?.message} />
    <Button disabled={mutation.isPending || isMutationRateLimited(mutation)} type="submit">{mutationButtonLabel("Resetting…", "Reset password", mutation)}</Button>
  </form>;
}
