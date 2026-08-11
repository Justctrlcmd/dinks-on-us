"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { PasswordInput } from "@/components/common/forms/password-input";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useRegister } from "@/hooks/mutations/use-auth-mutations";
import { registerSchema, type RegisterValues } from "@/validation/custom/auth-schemas";

export function RegisterForm() {
  const router = useRouter(); const mutation = useRegister(); const [message, setMessage] = useState<string>();
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "", password_confirmation: "" } });
  const submit = form.handleSubmit(async (values) => { setMessage(undefined); try { await mutation.mutateAsync(values); router.replace("/portal"); } catch (error) { setMessage(applyApiErrors(error, form.setError)); } });
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    {message && <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>}
    <InputWithLabel label="Name" autoComplete="name" required {...form.register("name")} error={form.formState.errors.name?.message} />
    <InputWithLabel label="Email" type="email" autoComplete="email" required {...form.register("email")} error={form.formState.errors.email?.message} />
    <PasswordInput label="Password" autoComplete="new-password" required {...form.register("password")} error={form.formState.errors.password?.message} />
    <PasswordInput label="Confirm password" autoComplete="new-password" required {...form.register("password_confirmation")} error={form.formState.errors.password_confirmation?.message} />
    <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Creating account..." : "Create account"}</Button>
    <p className="text-center text-sm text-muted-foreground">Already registered? <Link href="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link></p>
  </form>;
}
