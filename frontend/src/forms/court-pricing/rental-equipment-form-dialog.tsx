"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useCreateRentalEquipment, useUpdateRentalEquipment } from "@/hooks/mutations/use-court-pricing-mutations";
import type { RentalEquipment } from "@/types/court-pricing";
import { rentalEquipmentSchema, type RentalEquipmentValues } from "@/validation/custom/court-pricing-schema";

export function RentalEquipmentFormDialog({ equipment, open, onOpenChange }: { equipment: RentalEquipment | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreateRentalEquipment();
  const updateMutation = useUpdateRentalEquipment();
  const [message, setMessage] = useState<string>();
  const form = useForm<RentalEquipmentValues>({
    resolver: zodResolver(rentalEquipmentSchema),
    defaultValues: {
      name: equipment?.name ?? "",
      price: equipment?.price ?? 0,
      total_quantity: equipment?.total_quantity ?? 1,
    },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;
  const submit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      if (equipment) await updateMutation.mutateAsync({ id: equipment.id, input: values });
      else await createMutation.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      setMessage(applyApiErrors(error, form.setError));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{equipment ? "Edit rental equipment" : "Add rental equipment"}</DialogTitle>
          <DialogDescription>Price is charged once per selected unit for the whole reservation.</DialogDescription>
        </DialogHeader>
        <form id="rental-equipment-form" className="grid gap-5 py-2" onSubmit={submit} noValidate>
          {message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null}
          <InputWithLabel label="Equipment name" required {...form.register("name")} error={form.formState.errors.name?.message} />
          <InputWithLabel label="Equipment price" required type="number" min="0" step="0.01" inputMode="decimal" {...form.register("price", { valueAsNumber: true })} error={form.formState.errors.price?.message} />
          <InputWithLabel label="Quantity" required type="number" min="1" inputMode="numeric" {...form.register("total_quantity", { valueAsNumber: true })} error={form.formState.errors.total_quantity?.message} />
        </form>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button form="rental-equipment-form" type="submit" disabled={isPending}>{isPending ? "Saving…" : equipment ? "Save changes" : "Add equipment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
