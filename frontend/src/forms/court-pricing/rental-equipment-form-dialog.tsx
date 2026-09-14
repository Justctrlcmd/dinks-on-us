"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCreateRentalEquipment, useUpdateRentalEquipment } from "@/hooks/mutations/use-court-pricing-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { RentalEquipment } from "@/types/court-pricing";
import { rentalEquipmentSchema, type RentalEquipmentValues } from "@/validation/custom/court-pricing-schema";

export function RentalEquipmentFormDialog({ equipment, open, onOpenChange }: { equipment: RentalEquipment | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreateRentalEquipment();
  const updateMutation = useUpdateRentalEquipment();
  const form = useForm<RentalEquipmentValues>({
    resolver: zodResolver(rentalEquipmentSchema),
    defaultValues: {
      name: equipment?.name ?? "",
      price: equipment?.price ?? 0,
      total_quantity: equipment?.total_quantity ?? 1,
      is_active: equipment?.is_active ?? true,
    },
  });
  const isActive = useWatch({ control: form.control, name: "is_active" });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const submit = form.handleSubmit(async (values) => {
    try {
      if (equipment) await updateMutation.mutateAsync({ id: equipment.id, input: values });
      else await createMutation.mutateAsync(values);
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{equipment ? "Edit rental equipment" : "Add rental equipment"}</DialogTitle>
          <DialogDescription>Price is charged once per selected unit for the whole reservation.</DialogDescription>
        </DialogHeader>
        <form id="rental-equipment-form" className="grid gap-5 py-2" onSubmit={submit} noValidate>
          <InputWithLabel label="Equipment name" required {...form.register("name")} error={form.formState.errors.name?.message} />
          <InputWithLabel label="Equipment price" required type="number" min="0" step="0.01" inputMode="decimal" {...form.register("price", { valueAsNumber: true })} error={form.formState.errors.price?.message} />
          <InputWithLabel label="Quantity" required type="number" min="1" inputMode="numeric" {...form.register("total_quantity", { valueAsNumber: true })} error={form.formState.errors.total_quantity?.message} />
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/25 p-3">
            <Checkbox
              id="rental-equipment-active"
              checked={isActive}
              onCheckedChange={(checked) => form.setValue("is_active", checked === true, { shouldDirty: true, shouldValidate: true })}
              aria-invalid={Boolean(form.formState.errors.is_active)}
            />
            <div className="grid gap-1">
              <Label htmlFor="rental-equipment-active" className="cursor-pointer font-semibold">Active</Label>
              <p className="text-xs leading-5 text-muted-foreground">Active equipment is available for all reservation flows. Inactive equipment is hidden from new selections.</p>
            </div>
          </div>
        </form>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button form="rental-equipment-form" type="submit" disabled={isPending || isMutationRateLimited(createMutation, updateMutation)}>{mutationButtonLabel("Saving…", equipment ? "Save changes" : "Add equipment", createMutation, updateMutation)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
