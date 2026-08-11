import { FiInbox } from "react-icons/fi";
export function EmptyState({ title = "No records yet.", description = "Records created here will appear in this list.", action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center"><FiInbox className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" /><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
