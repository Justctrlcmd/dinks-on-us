"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FiPlus } from "react-icons/fi";
import { TextareaWithLabel } from "@/components/common/forms/textarea-with-label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useCreatePolicyRule, useUpdatePolicyRule } from "@/hooks/mutations/use-policy-mutations";
import type { PolicyRule, PolicySection, PolicySubheader } from "@/types/policy";
import { policyRuleSchema, type PolicyRuleValues } from "@/validation/custom/policy-schema";
import { PolicySubheaderFormDialog } from "./policy-subheader-form-dialog";

export function PolicyRuleFormDialog({ section, rule, open, onOpenChange }: { section: PolicySection; rule?: PolicyRule | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreatePolicyRule();
  const updateMutation = useUpdatePolicyRule();
  const [message, setMessage] = useState<string>();
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
    setMessage(undefined);
    try {
      if (rule) await updateMutation.mutateAsync({ id: rule.id, input: values });
      else await createMutation.mutateAsync({ sectionId: section.id, input: values });
      onOpenChange(false);
    } catch (error) {
      setMessage(applyApiErrors(error, form.setError));
    }
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
            {message && <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>}
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3"><label htmlFor="policy-subheader" className="font-medium">Sub-header <span aria-hidden="true">*</span></label><Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setNewSubheaderOpen(true)}><FiPlus aria-hidden="true" />New sub-header</Button></div>
              <Select value={selectedSubheader ? String(selectedSubheader.id) : undefined} onValueChange={(value) => form.setValue("policy_subheader_id", Number(value), { shouldValidate: true })}>
                <SelectTrigger id="policy-subheader" aria-invalid={Boolean(form.formState.errors.policy_subheader_id)} className="h-11 w-full"><SelectValue>{selectedSubheader?.title ?? "Select a sub-header"}</SelectValue></SelectTrigger>
                <SelectContent>{subheaders.map((subheader) => <SelectItem key={subheader.id} value={String(subheader.id)}>{subheader.title}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.policy_subheader_id && <p className="text-sm text-destructive">{form.formState.errors.policy_subheader_id.message}</p>}
            </div>
            <TextareaWithLabel label="Rule" required rows={6} placeholder="Enter the policy rule here..." {...form.register("content")} error={form.formState.errors.content?.message} />
          </form>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
            <Button form="policy-rule-form" type="submit" disabled={isPending || subheaders.length === 0}>{isPending ? (rule ? "Saving…" : "Adding…") : rule ? "Save changes" : "Add rule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {newSubheaderOpen && <PolicySubheaderFormDialog section={section} open onOpenChange={setNewSubheaderOpen} onCreated={(subheader) => { setSubheaders((items) => [...items, { ...subheader, rules: [] }]); form.setValue("policy_subheader_id", subheader.id, { shouldValidate: true }); }} />}
    </>
  );
}
