"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { PasswordInput } from "@/components/common/forms/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useResetTeamMemberPassword } from "@/hooks/mutations/use-team-access-mutations";
import type { TeamMember } from "@/types/team-access";
import { resetTeamPasswordSchema, type ResetPasswordValues } from "@/validation/custom/team-access-schema";

export function ResetTeamPasswordDialog({ member, open, onOpenChange }: { member: TeamMember; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useResetTeamMemberPassword();
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetTeamPasswordSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({ id: member.id, input: values });
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new login password for {member.name}. Their existing sessions will be signed out.</DialogDescription>
        </DialogHeader>
        <form id="reset-team-password-form" className="grid gap-4 py-1" onSubmit={submit} noValidate>
          <PasswordInput label="New password" autoComplete="new-password" required {...form.register("password")} error={form.formState.errors.password?.message} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" required {...form.register("password_confirmation")} error={form.formState.errors.password_confirmation?.message} />
        </form>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>Cancel</DialogClose>
          <Button form="reset-team-password-form" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Resetting…" : "Reset password"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
