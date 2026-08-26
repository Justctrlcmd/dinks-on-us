"use client";

import { FiAlertTriangle, FiCheck, FiInfo, FiX } from "react-icons/fi";
import { Toaster, toast } from "sonner";

const iconClassName = "grid size-5 shrink-0 place-items-center rounded-full border";

const appToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        duration={4500}
        visibleToasts={3}
        gap={8}
        offset={20}
        mobileOffset={12}
        icons={{
          success: <span className={`${iconClassName} border-success text-success`}><FiCheck aria-hidden="true" className="size-3" /></span>,
          error: <span className={`${iconClassName} border-destructive text-destructive`}><FiX aria-hidden="true" className="size-3" /></span>,
          warning: <span className={`${iconClassName} border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400`}><FiAlertTriangle aria-hidden="true" className="size-3" /></span>,
          info: <span className={`${iconClassName} border-primary text-primary`}><FiInfo aria-hidden="true" className="size-3" /></span>,
        }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "pointer-events-auto flex min-h-12 w-full items-center gap-2.5 rounded-lg border border-border border-l-[3px] bg-card px-3 py-3 text-card-foreground shadow-lg",
            title: "min-w-0 flex-1 break-words font-heading text-[13px] font-medium leading-4",
            content: "min-w-0 flex-1",
            icon: "m-0 shrink-0",
            success: "border-l-success",
            error: "border-l-destructive",
            warning: "border-l-amber-600 dark:border-l-amber-400",
            info: "border-l-primary",
            default: "border-l-primary",
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return appToast;
}
