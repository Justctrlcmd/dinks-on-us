import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
export const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
export type ReportQueryResult<T> = Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "refetch">;

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function formatDuration(value: number | null): string {
  if (value === null) return "—";
  if (value < 60) return `${Math.round(value)} min`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function AnalyticsCard({ title, description, children, className = "" }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ReportQueryState({ pending, error, empty, loadingMessage, onRetry, children }: {
  pending: boolean;
  error: boolean;
  empty: boolean;
  loadingMessage: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (pending) return <LoadingState message={loadingMessage} />;
  if (error) return <ErrorState title="We couldn't load these analytics." description="Try loading this report again." onRetry={onRetry} />;
  if (empty) return <EmptyState title="No reportable data exists for this range." description="Choose a wider date range or different filters to review historical activity." />;
  return children;
}

export function AccessibleDataTable({ caption, columns, rows }: {
  caption: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: Array<Record<string, ReactNode>>;
}) {
  return (
    <details className="mt-4 border-t pt-3">
      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">View accessible data table</summary>
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-muted/45 text-muted-foreground">
            <tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-3 py-2 font-semibold ${column.align === "right" ? "text-right" : ""}`}>{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.key} className={`px-3 py-2 ${column.align === "right" ? "text-right font-mono tabular-nums" : ""}`}>{row[column.key]}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </details>
  );
}
