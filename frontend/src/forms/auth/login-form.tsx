"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckboxWithLabel } from "@/components/common/forms/checkbox-with-label";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { PasswordInput } from "@/components/common/forms/password-input";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useLogin } from "@/hooks/mutations/use-auth-mutations";
import { loginSchema, type LoginValues } from "@/validation/custom/auth-schemas";

export function LoginForm() {
  const router = useRouter(); const mutation = useLogin(); const [message, setMessage] = useState<string>();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: false } });
  const submit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try { await mutation.mutateAsync(values); router.replace("/portal"); router.refresh(); }
    catch (error) { setMessage(applyApiErrors(error, form.setError)); }
  });
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    {message && <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>}
    <InputWithLabel label="Email" type="email" autoComplete="email" required {...form.register("email")} error={form.formState.errors.email?.message} />
    <PasswordInput label="Password" autoComplete="current-password" required {...form.register("password")} error={form.formState.errors.password?.message} />
    <div className="flex items-center justify-between gap-4"><Controller control={form.control} name="remember" render={({ field }) => <CheckboxWithLabel id="remember" label="Remember me" checked={field.value} onCheckedChange={field.onChange} />} /><Link href="/forgot-password" className="text-sm underline-offset-4 hover:underline">Forgot password?</Link></div>
    <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Signing in..." : "Sign in"}</Button>
    <p className="text-center text-sm text-muted-foreground">New here? <Link href="/register" className="text-foreground underline-offset-4 hover:underline">Create an account</Link></p>
  </form>;
}
