"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { useForgotPassword } from "@/hooks/mutations/use-auth-mutations";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/validation/custom/auth-schemas";

export function ForgotPasswordForm() {
  const mutation = useForgotPassword(); const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const submit = form.handleSubmit(async ({ email }) => { try { await mutation.mutateAsync(email); setSent(true); } catch {} });
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <InputWithLabel label="Email" type="email" autoComplete="email" required {...form.register("email")} error={form.formState.errors.email?.message} />
    <Button disabled={mutation.isPending || sent} type="submit">{mutation.isPending ? "Sending..." : "Send reset link"}</Button>
    <Link href="/login" className="text-center text-sm underline-offset-4 hover:underline">Back to sign in</Link>
  </form>;
}
