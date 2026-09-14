"use client";

import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/common/forms/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CurrentPasswordConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Back",
  destructive = false,
  pending,
  disabled = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending: boolean;
  disabled?: boolean;
  onConfirm: (currentPassword: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");

  function changeOpen(next: boolean) {
    if (pending) return;
    if (!next) setPassword("");
    onOpenChange(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || pending || disabled) return;

    try {
      await onConfirm(password);
      setPassword("");
    } catch {
      setPassword("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form id="current-password-confirmation-form" className="grid gap-4" onSubmit={submit} noValidate>
          <PasswordInput
            id="current-password-confirmation"
            label="Your current password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            description="This confirms that you are authorizing the action."
          />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => changeOpen(false)}>{cancelLabel}</Button>
          <Button form="current-password-confirmation-form" type="submit" variant={destructive ? "destructive" : "default"} disabled={pending || disabled || !password}>
            {pending ? "Confirming…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
