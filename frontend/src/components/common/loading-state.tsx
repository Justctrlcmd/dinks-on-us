import { FiLoader } from "react-icons/fi";
import { cn } from "@/lib/utils";

export function LoadingState({ message = "Loading...", fullPage = false }: { message?: string; fullPage?: boolean }) {
  return <div role="status" className={cn("flex items-center justify-center gap-3 text-muted-foreground", fullPage ? "min-h-[50vh]" : "py-8")}>
    <FiLoader className="animate-spin" aria-hidden="true" /><span>{message}</span>
  </div>;
}
