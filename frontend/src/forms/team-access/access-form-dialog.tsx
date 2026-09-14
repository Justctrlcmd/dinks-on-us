"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FiLayers } from "react-icons/fi";
import { CurrentPasswordConfirmationDialog } from "@/components/common/current-password-confirmation-dialog";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateAccess, useUpdateAccess } from "@/hooks/mutations/use-team-access-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { AccessModule } from "@/types/api";
import type { AccessModuleOption, AccessProfile } from "@/types/team-access";
import { accessSchema, type AccessValues } from "@/validation/custom/team-access-schema";

function ModuleChoice({ module, checked, onChange }: { module: AccessModuleOption; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = `access-module-${module.key.toLowerCase()}`;
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
      <Checkbox id={id} className="mt-0.5" checked={checked} onCheckedChange={onChange} />
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer font-semibold">{module.name}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{module.description}</p>
      </div>
    </div>
  );
}

export function AccessFormDialog({ access, modules, open, onOpenChange }: {
  access: AccessProfile | null;
  modules: AccessModuleOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateAccess();
  const updateMutation = useUpdateAccess();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<AccessValues | null>(null);
  const form = useForm<AccessValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: { name: access?.name ?? "", modules: access?.modules ?? [] },
  });
  const selected = useWatch({ control: form.control, name: "modules" }) ?? [];
  const managementModules = modules.filter((module) => module.group === "MANAGEMENT");
  const primaryModules = modules.filter((module) => module.group === null);
  const selectedManagement = managementModules.filter((module) => selected.includes(module.key));
  const showManagementModules = selectedManagement.length > 0;
  const allManagementSelected = selectedManagement.length === managementModules.length;
  const pending = createMutation.isPending || updateMutation.isPending;

  function setModule(module: AccessModule, checked: boolean) {
    const next = checked
      ? [...new Set([...selected, module])]
      : selected.filter((item) => item !== module);
    form.setValue("modules", next, { shouldDirty: true, shouldValidate: true });
  }

  function setManagement(checked: boolean) {
    const managementKeys = managementModules.map((module) => module.key);
    const next = checked
      ? [...new Set([...selected, ...managementKeys])]
      : selected.filter((module) => !managementKeys.includes(module));
    form.setValue("modules", next, { shouldDirty: true, shouldValidate: true });
  }

  const submit = form.handleSubmit((values) => {
    setPendingValues({ name: values.name.trim(), modules: values.modules });
    setConfirmationOpen(true);
  });

  async function confirm(currentPassword: string) {
    if (!pendingValues) return;
    const input = { ...pendingValues, current_password: currentPassword };
    if (access) await updateMutation.mutateAsync({ id: access.id, input });
    else await createMutation.mutateAsync(input);
    setConfirmationOpen(false);
    setPendingValues(null);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open && !confirmationOpen} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{access ? "Edit Access" : "Add Access"}</DialogTitle>
          <DialogDescription>Create a reusable module-access profile that can be assigned to Team members.</DialogDescription>
        </DialogHeader>

        <form id="access-form" className="grid gap-5 py-1" onSubmit={submit} noValidate>
          <InputWithLabel label="Access name" placeholder="e.g. Front Desk" required {...form.register("name")} error={form.formState.errors.name?.message} />

          <fieldset className="grid gap-2" aria-describedby={form.formState.errors.modules ? "access-modules-error" : undefined}>
            <legend className="mb-2 font-medium">Module access <span aria-hidden="true">*</span></legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {primaryModules.map((module) => (
                <ModuleChoice key={module.key} module={module} checked={selected.includes(module.key)} onChange={(checked) => setModule(module.key, checked)} />
              ))}
            </div>

            <div className="mt-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-start gap-3">
                <Checkbox id="access-module-management" className="mt-0.5" checked={allManagementSelected} onCheckedChange={setManagement} />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="access-module-management" className="cursor-pointer font-semibold">Management</Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select all Management workspaces, then clear any submodule this Access should not use.
                  </p>
                  {showManagementModules && !allManagementSelected ? <p className="mt-1 text-xs font-medium text-primary">{selectedManagement.length} of {managementModules.length} submodules selected</p> : null}
                </div>
                <FiLayers aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
              </div>

              {showManagementModules ? (
                <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2">
                  {managementModules.map((module) => (
                    <ModuleChoice key={module.key} module={module} checked={selected.includes(module.key)} onChange={(checked) => setModule(module.key, checked)} />
                  ))}
                </div>
              ) : null}
            </div>
            {form.formState.errors.modules ? <p id="access-modules-error" role="alert" className="text-xs leading-4 text-destructive">{form.formState.errors.modules.message}</p> : null}
          </fieldset>

        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button form="access-form" type="submit" disabled={pending || isMutationRateLimited(createMutation, updateMutation)}>{mutationButtonLabel("Saving…", access ? "Save changes" : "Add Access", createMutation, updateMutation)}</Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
      <CurrentPasswordConfirmationDialog
        open={open && confirmationOpen}
        onOpenChange={(next) => { setConfirmationOpen(next); if (!next) setPendingValues(null); }}
        title={`Confirm ${access ? "Access changes" : "new Access"}`}
        description={`Enter your current password to ${access ? "save these module-access changes" : "create this Access profile"}.`}
        confirmLabel={mutationButtonLabel("Saving…", access ? "Save changes" : "Add Access", createMutation, updateMutation)}
        pending={pending}
        disabled={isMutationRateLimited(createMutation, updateMutation)}
        onConfirm={confirm}
      />
    </>
  );
}
