"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useUpdateProfile } from "@/hooks/mutations/use-account-mutations";
import type { User } from "@/types/user";
import { updateProfileSchema, type UpdateProfileValues } from "@/validation/custom/auth-schemas";

export function UpdateProfileForm({ user }: { user: User }) {
  const mutation = useUpdateProfile(); const [message, setMessage] = useState<string>();
  const form = useForm<UpdateProfileValues>({ resolver: zodResolver(updateProfileSchema), defaultValues: { name: user.name, email: user.email } });
  useEffect(() => form.reset({ name: user.name, email: user.email }), [form, user]);
  const submit = form.handleSubmit(async (values) => { setMessage(undefined); try { const response = await mutation.mutateAsync(values); form.reset({ name: response.data.name, email: response.data.email }); setMessage(response.message); } catch (error) { setMessage(applyApiErrors(error, form.setError)); } });
  return <form onSubmit={submit} className="grid gap-4" noValidate>{message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
    <InputWithLabel label="Name" required {...form.register("name")} error={form.formState.errors.name?.message} />
    <InputWithLabel label="Email" type="email" required {...form.register("email")} error={form.formState.errors.email?.message} />
    <Button className="w-fit" disabled={mutation.isPending || !form.formState.isDirty} type="submit">Save profile</Button>
  </form>;
}
