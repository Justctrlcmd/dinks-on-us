"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type RateLimitCooldown = {
  isCoolingDown: boolean;
  remainingSeconds: number;
  label: string;
};

const storagePrefix = "dinks-on-us:rate-limit:";
const listeners = new Set<() => void>();
const expiries = new Map<string, number>();
const snapshots = new Map<string, RateLimitCooldown>();
const idleCooldown: RateLimitCooldown = { isCoolingDown: false, remainingSeconds: 0, label: "" };

function storageKey(key: string) {
  return `${storagePrefix}${key}`;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function readExpiry(key: string): number | null {
  const inMemory = expiries.get(key);
  if (inMemory) return inMemory;
  if (typeof window === "undefined") return null;

  const stored = Number(window.sessionStorage.getItem(storageKey(key)));
  if (!Number.isFinite(stored) || stored <= Date.now()) {
    window.sessionStorage.removeItem(storageKey(key));
    return null;
  }

  expiries.set(key, stored);
  return stored;
}

function snapshot(key: string): RateLimitCooldown {
  const expiry = readExpiry(key);
  const remainingSeconds = expiry ? Math.max(0, Math.ceil((expiry - Date.now()) / 1000)) : 0;
  if (remainingSeconds === 0 && expiry) {
    expiries.delete(key);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(storageKey(key));
  }

  if (remainingSeconds === 0) {
    snapshots.set(key, idleCooldown);
    return idleCooldown;
  }

  const next = {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    label: `Try again in ${formatCooldown(remainingSeconds)}`,
  };
  const previous = snapshots.get(key);
  if (previous && previous.remainingSeconds === next.remainingSeconds) return previous;
  snapshots.set(key, next);
  return next;
}

function formatCooldown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function startRateLimitCooldown(key: string, retryAfter: number): void {
  const expiry = Date.now() + Math.max(1, Math.ceil(retryAfter)) * 1_000;
  expiries.set(key, expiry);
  if (typeof window !== "undefined") window.sessionStorage.setItem(storageKey(key), String(expiry));
  notify();
}

export function useRateLimitCooldown(key: string): RateLimitCooldown {
  const getSnapshot = useCallback(() => snapshot(key), [key]);
  const cooldown = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    () => idleCooldown,
  );

  useEffect(() => {
    if (!cooldown.isCoolingDown) return;
    const timer = window.setInterval(notify, 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown.isCoolingDown]);

  return cooldown;
}
