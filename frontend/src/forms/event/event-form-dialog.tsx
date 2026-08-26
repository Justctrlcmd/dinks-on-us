"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FiImage, FiUploadCloud } from "react-icons/fi";
import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
import { InputWithLabel } from "@/components/common/forms/input-with-label";
import { TextareaWithLabel } from "@/components/common/forms/textarea-with-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateEvent, useUpdateEvent } from "@/hooks/mutations/use-event-mutations";
import type { EventInput, EventRecord } from "@/types/event";
import { EVENT_IMAGE_ACCEPT, eventSchema, type EventValues } from "@/validation/custom/event-schema";

export function EventFormDialog({
  event,
  open,
  onOpenChange,
}: {
  event: EventRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const schema = useMemo(() => eventSchema(!event), [event]);
  const form = useForm<EventValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      header: event?.header ?? "",
      description: event?.description ?? "",
      event_date: event?.event_date ?? "",
      image: undefined,
    },
  });
  const selectedFile = useWatch({ control: form.control, name: "image" })?.item(0) ?? undefined;
  const previewUrl = useMemo(
    () => selectedFile ? URL.createObjectURL(selectedFile) : event?.image_url,
    [event?.image_url, selectedFile],
  );
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedFile]);

  const submit = form.handleSubmit(async (values) => {
    const input: EventInput = {
      header: values.header.trim(),
      description: values.description.trim(),
      event_date: values.event_date,
      image: values.image?.item(0) ?? undefined,
    };

    try {
      if (event) await updateMutation.mutateAsync({ id: event.id, input });
      else await createMutation.mutateAsync(input);
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Add event"}</DialogTitle>
          <DialogDescription>
            {event ? "Update the public event details." : "The event will be published on the website as soon as it is added."}
          </DialogDescription>
        </DialogHeader>

        <form id="event-form" className="grid gap-4 py-1" onSubmit={submit} noValidate>
          <FormFieldWrapper
            id="event-image"
            label="Image"
            required={!event}
            description={event ? "Choose a new image only if you want to replace the current one. JPG, PNG, or WebP; maximum 5 MB." : "JPG, PNG, or WebP; maximum 5 MB."}
            error={form.formState.errors.image?.message}
          >
            {previewUrl ? (
              <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted/35">
                {/* Event images are staff-managed public storage assets and may use the configured API host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Event image preview" className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                <FiImage className="size-7" aria-hidden="true" />
              </div>
            )}
            <div className="relative">
              <FiUploadCloud className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="event-image"
                type="file"
                accept={EVENT_IMAGE_ACCEPT}
                className="h-10 cursor-pointer pl-9 file:mr-3"
                aria-invalid={Boolean(form.formState.errors.image)}
                aria-describedby={["event-image-description", form.formState.errors.image && "event-image-error"].filter(Boolean).join(" ")}
                {...form.register("image")}
              />
            </div>
          </FormFieldWrapper>

          <InputWithLabel
            label="Header"
            placeholder="Event headline"
            required
            {...form.register("header")}
            error={form.formState.errors.header?.message}
          />

          <TextareaWithLabel
            label="Description"
            placeholder="Share the full event details"
            rows={5}
            required
            {...form.register("description")}
            error={form.formState.errors.description?.message}
          />

          <Controller
            control={form.control}
            name="event_date"
            render={({ field, fieldState }) => (
              <FormFieldWrapper id="event-date" label="Event date" required error={fieldState.error?.message}>
                <CalendarDatePicker
                  id="event-date"
                  value={field.value}
                  placeholder="Choose the event date"
                  invalid={Boolean(fieldState.error)}
                  onChange={(value) => field.onChange(value)}
                />
              </FormFieldWrapper>
            )}
          />
        </form>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>Cancel</DialogClose>
          <Button form="event-form" type="submit" disabled={isPending}>
            {isPending ? "Saving…" : event ? "Save changes" : "Add event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
