"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextareaWithLabel } from "@/components/common/forms/textarea-with-label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyApiErrors } from "@/forms/apply-api-errors";
import { useCreateFaq, useUpdateFaq } from "@/hooks/mutations/use-faq-mutations";
import type { Faq } from "@/types/faq";
import { faqSchema, type FaqValues } from "@/validation/custom/faq-schema";

export function FaqFormDialog({
  faq,
  open,
  onOpenChange,
}: {
  faq: Faq | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateFaq();
  const updateMutation = useUpdateFaq();
  const [message, setMessage] = useState<string>();
  const form = useForm<FaqValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: { question: faq?.question ?? "", answer: faq?.answer ?? "" },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const submit = form.handleSubmit(async (values) => {
    setMessage(undefined);

    try {
      if (faq) {
        await updateMutation.mutateAsync({ id: faq.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (error) {
      setMessage(applyApiErrors(error, form.setError));
    }
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{faq ? "Edit FAQ" : "Create FAQ"}</DialogTitle>
          <DialogDescription>
            Add the question players will see, followed by its clear public answer.
          </DialogDescription>
        </DialogHeader>

        <form id="faq-form" className="grid gap-5 py-2" onSubmit={submit} noValidate>
          {message && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <TextareaWithLabel
            label="Question"
            required
            rows={3}
            placeholder="What would players like to know?"
            {...form.register("question")}
            error={form.formState.errors.question?.message}
          />
          <TextareaWithLabel
            label="Answer"
            required
            rows={7}
            placeholder="Write a helpful, straightforward answer."
            {...form.register("answer")}
            error={form.formState.errors.answer?.message}
          />
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>
            Cancel
          </DialogClose>
          <Button form="faq-form" type="submit" disabled={isPending}>
            {isPending ? (faq ? "Saving…" : "Creating…") : faq ? "Save changes" : "Create FAQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
