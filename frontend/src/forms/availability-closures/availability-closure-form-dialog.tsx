"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { FiPlus } from "react-icons/fi";
import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { FormFieldWrapper } from "@/components/common/forms/form-field-wrapper";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCloseCourtTimes,
  useCloseEntireOperation,
} from "@/hooks/mutations/use-availability-closure-mutations";
import { useReservationClosedDates } from "@/hooks/queries/use-court-pricing";
import { todayInTimeZone } from "@/lib/date";
import { formatDateOnly } from "@/lib/date";
import { formatHour } from "@/lib/time";
import {
  addTimeRange,
  canAddTimeRange,
  changeTimeRangeEnd,
  changeTimeRangeStart,
  removeLastTimeRange,
} from "@/lib/time-ranges";
import type { Court, CourtConfiguration } from "@/types/court-pricing";
import {
  availabilityClosureSchema,
  type AvailabilityClosureValues,
} from "@/validation/custom/court-pricing-schema";

function initialValues(
  configuration: CourtConfiguration | null,
): AvailabilityClosureValues {
  const openingHour = configuration?.opening_hour ?? 7;
  const closingHour = configuration?.closing_hour ?? 24;
  return {
    type: "entire_operation",
    date: "",
    periods: [{ start_hour: openingHour, end_hour: closingHour }],
    reason: "",
  };
}

function TimeRangeEditor({
  form,
  index,
  earliestStart,
  closingHour,
  onChangeStart,
  onChangeEnd,
}: {
  form: UseFormReturn<AvailabilityClosureValues>;
  index: number;
  earliestStart: number;
  closingHour: number;
  onChangeStart: (startHour: number) => void;
  onChangeEnd: (endHour: number) => void;
}) {
  const period = useWatch({ control: form.control, name: `periods.${index}` });
  const startOptions = Array.from(
    { length: closingHour - earliestStart },
    (_, option) => earliestStart + option,
  );
  const endOptions = Array.from(
    { length: Math.max(0, closingHour - period.start_hour) },
    (_, option) => period.start_hour + option + 1,
  );
  const error = form.formState.errors.periods?.[index];

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-2">
      <FormFieldWrapper
        id={`closure-from-${index}`}
        label="From"
        error={error?.start_hour?.message}
      >
        <Select
          value={String(period.start_hour)}
          onValueChange={(value) => onChangeStart(Number(value))}
        >
          <SelectTrigger
            id={`closure-from-${index}`}
            aria-invalid={Boolean(error?.start_hour)}
            className="h-11 w-full"
          >
            <SelectValue>{formatHour(period.start_hour)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {startOptions.map((hour) => (
              <SelectItem key={hour} value={String(hour)}>
                {formatHour(hour)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldWrapper>
      <FormFieldWrapper
        id={`closure-to-${index}`}
        label="To"
        error={error?.end_hour?.message}
      >
        <Select
          value={String(period.end_hour)}
          onValueChange={(value) => onChangeEnd(Number(value))}
        >
          <SelectTrigger
            id={`closure-to-${index}`}
            aria-invalid={Boolean(error?.end_hour)}
            className="h-11 w-full"
          >
            <SelectValue>{formatHour(period.end_hour)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {endOptions.map((hour) => (
              <SelectItem key={hour} value={String(hour)}>
                {formatHour(hour)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormFieldWrapper>
    </div>
  );
}

export function AvailabilityClosureFormDialog({
  configuration,
  courts,
  open,
  onOpenChange,
}: {
  configuration: CourtConfiguration | null;
  courts: Court[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const entireOperationMutation = useCloseEntireOperation();
  const courtTimesMutation = useCloseCourtTimes();
  const closedDatesQuery = useReservationClosedDates();
  const form = useForm<AvailabilityClosureValues>({
    resolver: zodResolver(availabilityClosureSchema),
    defaultValues: initialValues(configuration),
  });
  const type = useWatch({ control: form.control, name: "type" });
  const periods = useWatch({ control: form.control, name: "periods" });
  const courtId = useWatch({ control: form.control, name: "court_id" });
  const date = useWatch({ control: form.control, name: "date" });
  const pending =
    entireOperationMutation.isPending || courtTimesMutation.isPending;
  const openingHour = configuration?.opening_hour ?? 7;
  const closingHour = configuration?.closing_hour ?? 24;
  const hasConfiguration = Boolean(configuration);

  function switchType(nextType: AvailabilityClosureValues["type"]) {
    form.setValue("type", nextType, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (nextType === "court_time") {
      form.setValue(
        "periods",
        [{ start_hour: openingHour, end_hour: closingHour }],
        { shouldDirty: true, shouldValidate: true },
      );
    }
  }

  function changeEnd(index: number, endHour: number) {
    form.setValue("periods", changeTimeRangeEnd(periods, index, endHour), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function changeStart(index: number, startHour: number) {
    form.setValue("periods", changeTimeRangeStart(periods, index, startHour), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function addRange() {
    form.setValue(
      "periods",
      addTimeRange(periods, closingHour, (start_hour, end_hour) => ({
        start_hour,
        end_hour,
      })),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function removeLastRange() {
    form.setValue("periods", removeLastTimeRange(periods, closingHour), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const canAddRange = canAddTimeRange(periods, closingHour);

  const submit = form.handleSubmit(async (values) => {
    try {
      if (values.type === "entire_operation") {
        await entireOperationMutation.mutateAsync({
          date: values.date,
          reason: values.reason,
        });
      } else {
        await courtTimesMutation.mutateAsync({
          date: values.date,
          court_id: values.court_id!,
          periods: values.periods,
          reason: values.reason,
        });
      }
      form.reset(initialValues(configuration));
      onOpenChange(false);
    } catch {}
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {type === "entire_operation"
              ? "Add closed date"
              : "Add court time closure"}
          </DialogTitle>
          <DialogDescription>
            {type === "entire_operation"
              ? "Close the entire operation for a specific date."
              : "Make one court unavailable for selected times on a specific date."}
          </DialogDescription>
          <Button
            type="button"
            variant="link"
            className="h-auto self-start justify-start p-0 text-left text-sm"
            disabled={
              type === "entire_operation" &&
              (!hasConfiguration || courts.length === 0)
            }
            onClick={() =>
              switchType(
                type === "entire_operation" ? "court_time" : "entire_operation",
              )
            }
          >
            {type === "entire_operation"
              ? "Only one court is unavailable? Close specific court times."
              : "Close the entire operation instead."}
          </Button>
        </DialogHeader>
        <form
          id="availability-closure-form"
          className="grid gap-4 py-1"
          onSubmit={submit}
          noValidate
        >
          <FormFieldWrapper
            id="closure-date"
            label="Closure date"
            required
            error={form.formState.errors.date?.message}
          >
            <CalendarDatePicker
              id="closure-date"
              value={date}
              min={todayInTimeZone()}
              disabledDates={closedDatesQuery.data ?? []}
              invalid={Boolean(form.formState.errors.date)}
              onChange={(value) =>
                form.setValue("date", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder="Select closure date"
            />
            {type === "entire_operation" && date ? (
              <p className="text-xs text-muted-foreground">
                Selected date:{" "}
                <span className="font-medium text-foreground">
                  {formatDateOnly(date)}
                </span>
              </p>
            ) : null}
          </FormFieldWrapper>
          {type === "court_time" ? (
            <>
              <FormFieldWrapper
                id="closure-court"
                label="Court"
                required
                error={form.formState.errors.court_id?.message}
              >
                <Select
                  value={courtId ? String(courtId) : null}
                  onValueChange={(value) =>
                    form.setValue(
                      "court_id",
                      value === null ? undefined : Number(value),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger
                    id="closure-court"
                    aria-invalid={Boolean(form.formState.errors.court_id)}
                    className="h-11 w-full"
                  >
                    <SelectValue placeholder="Select a court" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((court) => (
                      <SelectItem key={court.id} value={String(court.id)}>
                        {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormFieldWrapper>
              <section
                className="grid gap-2.5"
                aria-labelledby="closure-time-ranges-title"
              >
                <div>
                  <h3
                    id="closure-time-ranges-title"
                    className="font-heading text-sm font-bold"
                  >
                    Closed time ranges
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Times stay within operating hours. Choose an earlier “To”
                    time to add another range.
                  </p>
                </div>
                {periods.map((period, index) => (
                  <TimeRangeEditor
                    key={`${period.start_hour}-${index}`}
                    form={form}
                    index={index}
                    earliestStart={
                      index === 0 ? openingHour : periods[index - 1].end_hour
                    }
                    closingHour={closingHour}
                    onChangeStart={(hour) => changeStart(index, hour)}
                    onChangeEnd={(hour) => changeEnd(index, hour)}
                  />
                ))}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    disabled={!canAddRange}
                    onClick={addRange}
                  >
                    <FiPlus aria-hidden="true" />
                    Add another time range
                  </Button>
                  {periods.length > 1 ? (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-muted-foreground"
                      onClick={removeLastRange}
                    >
                      Remove last time range
                    </Button>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
          <FormFieldWrapper
            id="closure-reason"
            label="Internal reason"
            required
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              id="closure-reason"
              rows={3}
              placeholder="Explain why this closure is needed…"
              aria-invalid={Boolean(form.formState.errors.reason)}
              {...form.register("reason")}
            />
          </FormFieldWrapper>
        </form>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={pending} />
            }
          >
            Cancel
          </DialogClose>
          <Button
            form="availability-closure-form"
            type="submit"
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : type === "entire_operation"
                ? "Close operation"
                : "Close court times"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
