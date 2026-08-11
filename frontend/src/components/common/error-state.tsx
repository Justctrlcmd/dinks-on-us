import { FiAlertCircle } from "react-icons/fi";
import { Button } from "@/components/ui/button";
export function ErrorState({ title = "We couldn't load this content.", description = "Please try again.", onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-xl border p-6 text-center"><FiAlertCircle className="mx-auto mb-3 size-8 text-destructive" aria-hidden="true" /><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p>{onRetry && <Button className="mt-4" variant="outline" onClick={onRetry}>Try again</Button>}</div>;
}
