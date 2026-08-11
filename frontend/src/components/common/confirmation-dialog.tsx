"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
export function ConfirmationDialog({ trigger, title, description, confirmLabel = "Confirm", onConfirm }: { trigger: React.ReactNode; title: string; description: string; confirmLabel?: string; onConfirm: () => void }) {
  return <Dialog><DialogTrigger render={trigger as React.ReactElement} /><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline">Cancel</Button>} /><DialogClose render={<Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>} /></DialogFooter></DialogContent></Dialog>;
}
