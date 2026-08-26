"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/common/forms/password-input";
import { useUpdatePassword } from "@/hooks/mutations/use-account-mutations";
import { updatePasswordSchema, type UpdatePasswordValues } from "@/validation/custom/auth-schemas";

export function ChangePasswordForm() {
  const mutation = useUpdatePassword();
  const form = useForm<UpdatePasswordValues>({ resolver: zodResolver(updatePasswordSchema), defaultValues: { current_password: "", password: "", password_confirmation: "" } });
  const submit = form.handleSubmit(async (values) => { try { await mutation.mutateAsync(values); form.reset(); } catch {} });
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <PasswordInput label="Current password" required {...form.register("current_password")} error={form.formState.errors.current_password?.message} />
    <PasswordInput label="New password" required {...form.register("password")} error={form.formState.errors.password?.message} />
    <PasswordInput label="Confirm new password" required {...form.register("password_confirmation")} error={form.formState.errors.password_confirmation?.message} />
    <Button className="w-fit" disabled={mutation.isPending} type="submit">Change password</Button>
  </form>;
}
