"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreatePolicySubheader, useUpdatePolicySubheader } from "@/hooks/mutations/use-policy-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { PolicySection, PolicySubheader } from "@/types/policy";
import { policySubheaderSchema, type PolicySubheaderValues } from "@/validation/custom/policy-schema";

export function PolicySubheaderFormDialog({
  section, subheader, open, onOpenChange, onCreated,
}: {
  section: PolicySection;
  subheader?: PolicySubheader | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (subheader: PolicySubheader) => void;
}) {
  const createMutation = useCreatePolicySubheader();
  const updateMutation = useUpdatePolicySubheader();
  const form = useForm<PolicySubheaderValues>({
    resolver: zodResolver(policySubheaderSchema),
    defaultValues: { title: subheader?.title ?? "" },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (subheader) {
        await updateMutation.mutateAsync({ id: subheader.id, input: values });
      } else {
        const response = await createMutation.mutateAsync({ sectionId: section.id, input: values });
        onCreated?.(response.data);
      }
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subheader ? "Edit sub-header" : "Add sub-header"}</DialogTitle>
          <DialogDescription>{subheader ? "Update the sub-header shown above its rules." : `Add a sub-header to ${section.name}.`}</DialogDescription>
        </DialogHeader>
        <form id="policy-subheader-form" className="grid gap-5 py-2" onSubmit={submit} noValidate>
          <InputWithLabel label="Sub-header name" required placeholder="Arrival and Court Time" {...form.register("title")} error={form.formState.errors.title?.message} />
        </form>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button form="policy-subheader-form" type="submit" disabled={isPending || isMutationRateLimited(createMutation, updateMutation)}>{mutationButtonLabel(subheader ? "Saving…" : "Adding…", subheader ? "Save changes" : "Add sub-header", createMutation, updateMutation)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
