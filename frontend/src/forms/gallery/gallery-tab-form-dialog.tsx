"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateGalleryTab, useUpdateGalleryTab } from "@/hooks/mutations/use-gallery-mutations";
import type { GalleryTab } from "@/types/gallery";
import { galleryTabSchema, type GalleryTabValues } from "@/validation/custom/gallery-schema";

export function GalleryTabFormDialog({
  tab,
  open,
  onOpenChange,
}: {
  tab: GalleryTab | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateGalleryTab();
  const updateMutation = useUpdateGalleryTab();
  const form = useForm<GalleryTabValues>({
    resolver: zodResolver(galleryTabSchema),
    defaultValues: { name: tab?.name ?? "" },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    const input = { name: values.name.trim() };
    try {
      if (tab) await updateMutation.mutateAsync({ id: tab.id, input });
      else await createMutation.mutateAsync(input);
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tab ? "Edit category" : "Add category"}</DialogTitle>
          <DialogDescription>
            {tab ? "Update the category name shown in the admin and landing-page tabs." : "The new category is added after the existing landing-page tabs."}
          </DialogDescription>
        </DialogHeader>

        <form id="gallery-tab-form" className="py-1" onSubmit={submit} noValidate>
          <InputWithLabel
            label="Category name"
            placeholder="e.g. Interior"
            required
            autoFocus
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button form="gallery-tab-form" type="submit" disabled={isPending}>
            {isPending ? "Saving…" : tab ? "Save changes" : "Add category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
