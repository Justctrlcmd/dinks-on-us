"use client";

import { FiFilter } from "react-icons/fi";
import { CalendarDatePicker } from "@/components/common/calendar-date-picker";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reportRangeOptions, type ReportDateRange, type ReportRangePreset } from "@/lib/report-date-ranges";
import type { ReportContext, ReportSource } from "@/types/reports";

export function ReportFilterBar({
  preset,
  draftRange,
  today,
  courtId,
  source,
  courts,
  customError,
  onPresetChange,
  onDraftRangeChange,
  onApplyCustom,
  onCourtChange,
  onSourceChange,
}: {
  preset: ReportRangePreset;
  draftRange: ReportDateRange;
  today: string;
  courtId: number | null;
  source: ReportSource | null;
  courts: ReportContext["courts"];
  customError: string | null;
  onPresetChange: (value: ReportRangePreset) => void;
  onDraftRangeChange: (range: ReportDateRange) => void;
  onApplyCustom: () => void;
  onCourtChange: (value: number | null) => void;
  onSourceChange: (value: ReportSource | null) => void;
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><FiFilter aria-hidden="true" />Report filters</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SelectWithLabel className="col-span-2 md:col-span-1" id="report-range" label="Date Range" value={preset} options={reportRangeOptions} onValueChange={(value) => value && onPresetChange(value as ReportRangePreset)} />
          <SelectWithLabel
            id="report-court"
            label="Court"
            value={courtId === null ? "ALL" : String(courtId)}
            options={[{ value: "ALL", label: "All Courts" }, ...courts.map((court) => ({ value: String(court.id), label: `${court.name}${court.is_active ? "" : " (Inactive)"}` }))]}
            onValueChange={(value) => onCourtChange(value && value !== "ALL" ? Number(value) : null)}
          />
          <SelectWithLabel
            id="report-source"
            label="Source"
            value={source ?? "ALL"}
            options={[{ value: "ALL", label: "All Sources" }, { value: "ONLINE", label: "Online" }, { value: "WALK_IN", label: "Walk-In" }]}
            onValueChange={(value) => onSourceChange(value && value !== "ALL" ? value as ReportSource : null)}
          />
        </div>

        {preset === "CUSTOM" ? (
          <div className="grid gap-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-1.5">
              <label htmlFor="report-from" className="text-sm font-medium">From</label>
              <CalendarDatePicker id="report-from" value={draftRange.from} max={draftRange.to || today} onChange={(from) => onDraftRangeChange({ ...draftRange, from })} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="report-to" className="text-sm font-medium">To</label>
              <CalendarDatePicker id="report-to" value={draftRange.to} min={draftRange.from} max={today} onChange={(to) => onDraftRangeChange({ ...draftRange, to })} />
            </div>
            <Button type="button" className="h-10 px-4" disabled={!draftRange.from || !draftRange.to || Boolean(customError)} onClick={onApplyCustom}>Apply</Button>
            {customError ? <p role="alert" className="text-sm text-destructive sm:col-span-3">{customError}</p> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
