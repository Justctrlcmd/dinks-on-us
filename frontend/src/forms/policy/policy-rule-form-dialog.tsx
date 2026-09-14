"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FiPlus } from "react-icons/fi";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { TextareaWithLabel } from "@/components/common/forms/textarea-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreatePolicyRule, useUpdatePolicyRule } from "@/hooks/mutations/use-policy-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { PolicyRule, PolicySection, PolicySubheader } from "@/types/policy";
import { policyRuleSchema, type PolicyRuleValues } from "@/validation/custom/policy-schema";
import { PolicySubheaderFormDialog } from "./policy-subheader-form-dialog";

export function PolicyRuleFormDialog({ section, rule, open, onOpenChange }: { section: PolicySection; rule?: PolicyRule | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreatePolicyRule();
  const updateMutation = useUpdatePolicyRule();
  const [subheaders, setSubheaders] = useState<PolicySubheader[]>(section.subheaders);
  const [newSubheaderOpen, setNewSubheaderOpen] = useState(false);
  const form = useForm<PolicyRuleValues>({
    resolver: zodResolver(policyRuleSchema),
    defaultValues: { policy_subheader_id: rule?.policy_subheader_id ?? section.subheaders[0]?.id, content: rule?.content ?? "" },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedSubheaderId = useWatch({ control: form.control, name: "policy_subheader_id" });
  const selectedSubheader = subheaders.find(({ id }) => id === selectedSubheaderId);

  const submit = form.handleSubmit(async (values) => {
    try {
      if (rule) await updateMutation.mutateAsync({ id: rule.id, input: values });
      else await createMutation.mutateAsync({ sectionId: section.id, input: values });
      onOpenChange(false);
    } catch {}
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{rule ? "Edit rule" : "Add rule"}</DialogTitle>
            <DialogDescription>{rule ? "Change the rule text or move it within this policy section." : `Add a rule to ${section.name}.`}</DialogDescription>
          </DialogHeader>
          <form id="policy-rule-form" className="grid gap-5 py-2" onSubmit={submit} noValidate>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="policy-subheader">Sub-header <span aria-hidden="true">*</span></Label>
                <Button type="button" variant="link" size="sm" className="h-auto shrink-0 whitespace-nowrap px-0" onClick={() => setNewSubheaderOpen(true)}><FiPlus aria-hidden="true" />New sub-header</Button>
              </div>
              <SelectWithLabel
                id="policy-subheader"
                ariaLabel="Sub-header"
                required
                className="min-w-0"
                value={selectedSubheader ? String(selectedSubheader.id) : null}
                options={subheaders.map((subheader) => ({ value: String(subheader.id), label: subheader.title }))}
                placeholder="Select a sub-header"
                error={form.formState.errors.policy_subheader_id?.message}
                onValueChange={(value) => form.setValue("policy_subheader_id", value ? Number(value) : 0, { shouldValidate: true })}
              />
            </div>
            <TextareaWithLabel label="Rule" required rows={6} placeholder="Enter the policy rule here..." {...form.register("content")} error={form.formState.errors.content?.message} />
          </form>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
            <Button form="policy-rule-form" type="submit" disabled={isPending || isMutationRateLimited(createMutation, updateMutation) || subheaders.length === 0}>{mutationButtonLabel(rule ? "Saving…" : "Adding…", rule ? "Save changes" : "Add rule", createMutation, updateMutation)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {newSubheaderOpen && <PolicySubheaderFormDialog section={section} open onOpenChange={setNewSubheaderOpen} onCreated={(subheader) => { setSubheaders((items) => [...items, { ...subheader, rules: [] }]); form.setValue("policy_subheader_id", subheader.id, { shouldValidate: true }); }} />}
    </>
  );
}
