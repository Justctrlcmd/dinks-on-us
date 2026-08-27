"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { PasswordInput } from "@/components/common/forms/password-input";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useLogin } from "@/hooks/mutations/use-auth-mutations";
import { loginSchema, type LoginValues } from "@/validation/custom/auth-schemas";

export function LoginForm() {
  const router = useRouter();
  const mutation = useLogin();
  const [message, setMessage] = useState<string>();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      await mutation.mutateAsync(values);
      router.replace("/portal");
      router.refresh();
    } catch (error) {
      setMessage(applyApiErrors(error, form.setError));
    }
  });

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <InputWithLabel
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Enter your email"
        className="h-10 rounded-xl bg-background/70 px-4"
        aria-required="true"
        {...form.register("email")}
        error={form.formState.errors.email?.message}
      />
      <PasswordInput
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        className="h-10 rounded-xl bg-background/70 px-4 pr-12"
        aria-required="true"
        {...form.register("password")}
        error={form.formState.errors.password?.message}
      />
      <Button
        disabled={mutation.isPending}
        type="submit"
        className="mt-1 h-12 w-full rounded-xl bg-energy px-5 text-base font-bold text-energy-foreground hover:bg-energy/90"
      >
        {mutation.isPending ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
