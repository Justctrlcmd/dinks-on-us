"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FiImage, FiUploadCloud } from "react-icons/fi";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreatePaymentMethod, useUpdatePaymentMethod } from "@/hooks/mutations/use-payment-method-mutations";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import type { PaymentMethod } from "@/types/payment-method";
import { PAYMENT_QR_ACCEPT, paymentMethodSchema, type PaymentMethodValues } from "@/validation/custom/payment-method-schema";

export function PaymentMethodFormDialog({
  paymentMethod,
  open,
  onOpenChange,
}: {
  paymentMethod: PaymentMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const schema = useMemo(() => paymentMethodSchema(!paymentMethod), [paymentMethod]);
  const form = useForm<PaymentMethodValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: paymentMethod?.name ?? "",
      account_name: paymentMethod?.account_name ?? "",
      account_number: paymentMethod?.account_number ?? "",
      qr_image: undefined,
    },
  });
  const selectedFile = useWatch({ control: form.control, name: "qr_image" })?.item(0) ?? undefined;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const previewUrl = useMemo(
    () => selectedFile ? URL.createObjectURL(selectedFile) : paymentMethod?.qr_image_url,
    [paymentMethod?.qr_image_url, selectedFile],
  );

  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedFile]);

  const submit = form.handleSubmit(async (values) => {
    const input = {
      name: values.name.trim(),
      account_name: values.account_name.trim(),
      account_number: values.account_number.trim(),
      qr_image: values.qr_image?.item(0) ?? undefined,
    };

    try {
      if (paymentMethod) await updateMutation.mutateAsync({ id: paymentMethod.id, input });
      else await createMutation.mutateAsync(input);
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{paymentMethod ? "Edit payment method" : "Add payment method"}</DialogTitle>
          <DialogDescription>
            Add the payment account details players need when completing a manual transfer.
          </DialogDescription>
        </DialogHeader>

        <form id="payment-method-form" className="grid gap-4 py-1" onSubmit={submit} noValidate>
          <InputWithLabel
            label="E-wallet / bank"
            placeholder="e.g. GCash or BPI"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />

          <FormFieldWrapper
            id="payment-qr-image"
            label="QR image"
            required={!paymentMethod}
            description={paymentMethod ? "Choose a new image only if you want to replace the current QR code. JPG, PNG, or WebP; maximum 5 MB." : "JPG, PNG, or WebP; maximum 5 MB."}
            error={form.formState.errors.qr_image?.message}
          >
            {previewUrl ? (
              <div className="relative mx-auto aspect-square w-full max-w-40 overflow-hidden rounded-lg border bg-muted/35 p-2">
                {/* QR images are user-managed public storage assets and may use the configured API host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="QR image preview" className="size-full object-contain" />
              </div>
            ) : (
              <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                <FiImage className="size-6" aria-hidden="true" />
              </div>
            )}
            <div className="relative">
              <FiUploadCloud className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="payment-qr-image"
                type="file"
                accept={PAYMENT_QR_ACCEPT}
                className="h-10 cursor-pointer pl-9 file:mr-3"
                aria-invalid={Boolean(form.formState.errors.qr_image)}
                aria-describedby={["payment-qr-image-description", form.formState.errors.qr_image && "payment-qr-image-error"].filter(Boolean).join(" ")}
                {...form.register("qr_image")}
              />
            </div>
          </FormFieldWrapper>

          <InputWithLabel
            label="Account name"
            placeholder="Name shown on the receiving account"
            required
            {...form.register("account_name")}
            error={form.formState.errors.account_name?.message}
          />
          <InputWithLabel
            label="Account number"
            placeholder="Account number or wallet identifier"
            inputMode="numeric"
            required
            {...form.register("account_number")}
            error={form.formState.errors.account_number?.message}
          />
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button form="payment-method-form" type="submit" disabled={isPending || isMutationRateLimited(createMutation, updateMutation)}>
            {mutationButtonLabel("Saving…", paymentMethod ? "Save changes" : "Add payment method", createMutation, updateMutation)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
