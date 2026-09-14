"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FiImage, FiUploadCloud } from "react-icons/fi";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateGalleryImage, useUpdateGalleryImage } from "@/hooks/mutations/use-gallery-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { GalleryImage, GalleryImageInput, GalleryTab } from "@/types/gallery";
import { GALLERY_IMAGE_ACCEPT, galleryImageSchema, type GalleryImageValues } from "@/validation/custom/gallery-schema";

export function GalleryImageFormDialog({
  image,
  tabs,
  initialTabId,
  open,
  onOpenChange,
}: {
  image: GalleryImage | null;
  tabs: GalleryTab[];
  initialTabId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateGalleryImage();
  const updateMutation = useUpdateGalleryImage();
  const schema = useMemo(() => galleryImageSchema(!image), [image]);
  const form = useForm<GalleryImageValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gallery_tab_id: image?.gallery_tab_id ?? initialTabId,
      alt_text: image?.alt_text ?? "",
      image: undefined,
    },
  });
  const selectedTabId = useWatch({ control: form.control, name: "gallery_tab_id" });
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);
  const selectedFile = useWatch({ control: form.control, name: "image" })?.item(0) ?? undefined;
  const previewUrl = useMemo(
    () => selectedFile ? URL.createObjectURL(selectedFile) : image?.image_url,
    [image?.image_url, selectedFile],
  );
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedFile]);

  const submit = form.handleSubmit(async (values) => {
    const input: GalleryImageInput = {
      gallery_tab_id: values.gallery_tab_id,
      alt_text: values.alt_text.trim(),
      image: values.image?.item(0) ?? undefined,
    };

    try {
      if (image) await updateMutation.mutateAsync({ id: image.id, input });
      else await createMutation.mutateAsync(input);
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{image ? "Edit gallery image" : "Add gallery image"}</DialogTitle>
          <DialogDescription>
            JPG, PNG, or WebP up to 5 MB. A 4:3 image is recommended for the landing-page grid.
          </DialogDescription>
        </DialogHeader>

        <form id="gallery-image-form" className="grid gap-4 py-1" onSubmit={submit} noValidate>
          <FormFieldWrapper
            id="gallery-image"
            label="Image"
            required={!image}
            description={image ? "Choose a new file only if you want to replace the current image." : undefined}
            error={form.formState.errors.image?.message}
          >
            {previewUrl ? (
              <div className="mx-auto aspect-[4/3] w-full max-w-64 overflow-hidden rounded-lg border bg-muted/35">
                {/* Staff-managed public storage assets may use the configured API host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Gallery image preview" className="size-full object-cover" />
              </div>
            ) : (
              <div className="mx-auto flex aspect-[4/3] w-full max-w-64 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                <FiImage className="size-7" aria-hidden="true" />
              </div>
            )}
            <div className="relative">
              <FiUploadCloud className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="gallery-image"
                type="file"
                accept={GALLERY_IMAGE_ACCEPT}
                className="h-10 cursor-pointer pl-9 file:mr-3"
                aria-invalid={Boolean(form.formState.errors.image)}
                aria-describedby={["gallery-image-description", form.formState.errors.image && "gallery-image-error"].filter(Boolean).join(" ")}
                {...form.register("image")}
              />
            </div>
          </FormFieldWrapper>

          <SelectWithLabel
            id="gallery-category"
            label="Category"
            required
            value={selectedTab ? String(selectedTab.id) : null}
            options={tabs.map((tab) => ({ value: String(tab.id), label: tab.name }))}
            placeholder="Choose a category"
            error={form.formState.errors.gallery_tab_id?.message}
            onValueChange={(value) => form.setValue("gallery_tab_id", value ? Number(value) : 0, { shouldDirty: true, shouldValidate: true })}
          />

          <InputWithLabel
            label="Alt text"
            placeholder="e.g. Players rallying on the indoor court"
            description="Briefly describe what appears in the image for accessibility."
            required
            {...form.register("alt_text")}
            error={form.formState.errors.alt_text?.message}
          />
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button form="gallery-image-form" type="submit" disabled={isPending || isMutationRateLimited(createMutation, updateMutation)}>
            {mutationButtonLabel("Saving…", image ? "Save changes" : "Add image", createMutation, updateMutation)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
