"use client";

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/common/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/providers/query-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider><QueryProvider><TooltipProvider>{children}</TooltipProvider></QueryProvider></ToastProvider>
    </ThemeProvider>
  );
}
