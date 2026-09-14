"use client";

import { useDeferredValue, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { SelectWithLabel } from "@/components/common/forms/select-with-label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActionLogs } from "@/hooks/queries/use-action-logs";
import { formatDateTime } from "@/lib/date";
import type { ActionLog } from "@/types/action-logs";

const moduleOptions = [
  { value: "ALL", label: "All areas" },
  { value: "RESERVATION", label: "Reservations" },
  { value: "MANAGEMENT_COURT_PRICING", label: "Courts & Pricing" },
  { value: "MANAGEMENT_AVAILABILITY_CLOSURES", label: "Availability & Closures" },
  { value: "MANAGEMENT_PAYMENT_METHODS", label: "Payment Methods" },
  { value: "MANAGEMENT_TEAM_ACCESS", label: "Team & Access" },
  { value: "MANAGEMENT_RULES_POLICIES", label: "Rules & Policies" },
  { value: "MANAGEMENT_EVENTS", label: "Events" },
  { value: "MANAGEMENT_GALLERY", label: "Gallery" },
  { value: "MANAGEMENT_FAQS", label: "FAQs" },
  { value: "MANAGEMENT_STORAGE_RETENTION", label: "Storage & Data Retention" },
  { value: "SECURITY", label: "Security" },
  { value: "ACCOUNT", label: "Account" },
];

const moduleLabels = Object.fromEntries(moduleOptions.filter((option) => option.value).map((option) => [option.value, option.label]));

function ActionLogCard({ log }: { log: ActionLog }) {
  return <article className="grid gap-1.5 rounded-lg border bg-background p-3">
    <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 font-medium">{log.action_label}</h3><span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{moduleLabels[log.module] ?? log.module}</span></div>
    <p className="text-xs text-muted-foreground">{formatDateTime(log.created_at)} by {log.actor_name}</p>
  </article>;
}

export function ActionLogsManagementView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("ALL");
  const deferredSearch = useDeferredValue(search.trim());
  const query = useActionLogs({ page, search: deferredSearch, module: module === "ALL" ? "" : module });

  function updateSearch(value: string) { setSearch(value); setPage(1); }
  function updateModule(value: string) { setModule(value); setPage(1); }

  return <div className="grid gap-4">
    <PageHeader title="Action Logs" description="Completed staff and management actions, plus account-security events. Customer reservations and device notification changes are excluded." />
    <Card size="sm"><CardContent className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1"><FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Search person, item, or action" aria-label="Search action logs" className="pl-9" /></div>
      <SelectWithLabel id="action-log-module" value={module} onValueChange={(value) => updateModule(value ?? "")} options={moduleOptions} ariaLabel="Filter action logs by area" className="w-full sm:w-56" />
    </CardContent></Card>
    <Card size="sm" className="gap-0 py-0">
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Completed system actions</caption><thead className="border-b bg-muted/45 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Performed by</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Area</th></tr></thead><tbody className="divide-y">{query.isPending ? <tr><td colSpan={4}><LoadingState message="Loading action logs…" /></td></tr> : query.isError ? <tr><td colSpan={4} className="p-4"><ErrorState title="We couldn't load the action logs." onRetry={() => void query.refetch()} /></td></tr> : query.data.data.length === 0 ? <tr><td colSpan={4}><EmptyState title="No actions match these filters." description="Completed operational and account-security actions will appear here." /></td></tr> : query.data.data.map((log) => <tr key={log.id} className="hover:bg-muted/30"><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(log.created_at)}</td><td className="px-4 py-3 font-medium">{log.actor_name}</td><td className="px-4 py-3">{log.action_label}</td><td className="px-4 py-3 text-muted-foreground">{moduleLabels[log.module] ?? log.module}</td></tr>)}</tbody></table></div>
      <div className="grid gap-2 p-3 md:hidden">{query.isPending ? <LoadingState message="Loading action logs…" /> : query.isError ? <ErrorState title="We couldn't load the action logs." onRetry={() => void query.refetch()} /> : query.data.data.length === 0 ? <EmptyState title="No actions match these filters." description="Completed operational and account-security actions will appear here." /> : query.data.data.map((log) => <ActionLogCard key={log.id} log={log} />)}</div>
      {!query.isPending && !query.isError && query.data.meta.last_page > 1 ? <div className="border-t p-3"><Pagination page={page} lastPage={query.data.meta.last_page} onChange={setPage} /></div> : null}
    </Card>
  </div>;
}
