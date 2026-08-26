import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  id: string; label: string; description?: string; error?: string; required?: boolean;
  children: React.ReactNode; className?: string;
}

export function FormFieldWrapper({ id, label, description, error, required, children, className }: Props) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</Label>
      {description && <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p>}
      {children}
      {error && <p id={errorId} role="alert" className="text-xs leading-4 text-destructive">{error}</p>}
    </div>
  );
}
