"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { icons } from "@/config/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const subscribe = () => () => undefined;

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const Icon = mounted && resolvedTheme === "dark" ? icons.sun : icons.moon;

  return <Button className={cn(className)} variant="ghost" size="icon" disabled={!mounted} aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Icon aria-hidden="true" /></Button>;
}
