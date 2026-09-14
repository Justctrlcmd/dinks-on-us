"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { useUpdateProfile } from "@/hooks/mutations/use-account-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { User } from "@/types/user";
import { updateProfileSchema, type UpdateProfileValues } from "@/validation/custom/auth-schemas";

export function UpdateProfileForm({ user }: { user: User }) {
  const mutation = useUpdateProfile();
  const form = useForm<UpdateProfileValues>({ resolver: zodResolver(updateProfileSchema), defaultValues: { name: user.name, email: user.email } });
  useEffect(() => form.reset({ name: user.name, email: user.email }), [form, user]);
  const submit = form.handleSubmit(async (values) => { try { const response = await mutation.mutateAsync(values); form.reset({ name: response.data.name, email: response.data.email }); } catch {} });
  return <form onSubmit={submit} className="grid gap-4 lg:flex lg:flex-1 lg:flex-col" noValidate>
    <InputWithLabel label="Name" required {...form.register("name")} error={form.formState.errors.name?.message} />
    <InputWithLabel label="Email" type="email" required {...form.register("email")} error={form.formState.errors.email?.message} />
    <Button className="w-fit lg:mt-auto" disabled={mutation.isPending || isMutationRateLimited(mutation) || !form.formState.isDirty} type="submit">{mutationButtonLabel("Saving…", "Save profile", mutation)}</Button>
  </form>;
}
