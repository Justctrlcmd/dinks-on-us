"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { PasswordInput } from "@/components/common/forms/password-input";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateTeamMember, useUpdateTeamMember } from "@/hooks/mutations/use-team-access-mutations";
import type { AccessProfile, TeamMember } from "@/types/team-access";
import { teamSchema, type TeamValues } from "@/validation/custom/team-access-schema";

export function TeamFormDialog({ member, accesses, open, onOpenChange }: {
  member: TeamMember | null;
  accesses: AccessProfile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember();
  const isCreate = !member;
  const schema = useMemo(() => teamSchema(isCreate), [isCreate]);
  const form = useForm<TeamValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: member?.name ?? "",
      email: member?.email ?? "",
      contact_number: member?.contact_number ?? "",
      role_id: member?.access.id ?? 0,
      password: "",
      password_confirmation: "",
    },
  });
  const selectedAccessId = useWatch({ control: form.control, name: "role_id" });
  const selectedAccess = accesses.find((access) => access.id === selectedAccessId);
  const pending = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    const baseInput = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      contact_number: values.contact_number,
      role_id: values.role_id,
    };
    try {
      if (member) await updateMutation.mutateAsync({ id: member.id, input: baseInput });
      else await createMutation.mutateAsync({ ...baseInput, password: values.password, password_confirmation: values.password_confirmation });
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{member ? "Edit Team member" : "Add Team"}</DialogTitle>
          <DialogDescription>{member ? "Update the member's contact details and assigned Access." : "Create a Team account. The member will use their email and password to log in."}</DialogDescription>
        </DialogHeader>

        <form id="team-form" className="grid gap-4 py-1" onSubmit={submit} noValidate>
          <InputWithLabel label="Name" autoComplete="name" required {...form.register("name")} error={form.formState.errors.name?.message} />
          <InputWithLabel label="Email" type="email" autoComplete="email" required {...form.register("email")} error={form.formState.errors.email?.message} description="This email is used to log in." />
          <InputWithLabel
            label="Contact number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="09XXXXXXXXX"
            maxLength={11}
            pattern="09[0-9]{9}"
            required
            onInput={(event) => {
              event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 11);
            }}
            {...form.register("contact_number")}
            error={form.formState.errors.contact_number?.message}
            description="Must start with 09 and contain exactly 11 digits."
          />

          {isCreate ? (
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <PasswordInput label="Password" autoComplete="new-password" required {...form.register("password")} error={form.formState.errors.password?.message} />
              <PasswordInput label="Confirm password" autoComplete="new-password" required {...form.register("password_confirmation")} error={form.formState.errors.password_confirmation?.message} />
            </div>
          ) : null}

          <SelectWithLabel
            id="team-access"
            label="Access"
            required
            value={selectedAccess ? String(selectedAccess.id) : null}
            options={accesses.map((access) => ({ value: String(access.id), label: access.name }))}
            placeholder="Select Access"
            error={form.formState.errors.role_id?.message}
            onValueChange={(value) => form.setValue("role_id", value ? Number(value) : 0, { shouldDirty: true, shouldValidate: true })}
          />
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button form="team-form" type="submit" disabled={pending}>{pending ? "Saving…" : member ? "Save changes" : "Add Team"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
