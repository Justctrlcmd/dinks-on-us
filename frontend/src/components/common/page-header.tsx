export function PageHeader({ title, description, actions, actionsClassName }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  actionsClassName?: string;
}) {
  return (
    <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actionsClassName ? <div className={actionsClassName}>{actions}</div> : actions}
    </div>
  );
}
