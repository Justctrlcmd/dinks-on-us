"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { reservationKeys } from "@/config/query-keys";
import { registerServiceWorker } from "@/lib/pwa";

function playNotificationChime(): void {
  if (window.localStorage.getItem("dinks-on-us:notification-sound") !== "on") return;

  try {
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // A browser may reject audio until a user gesture; the system notification remains available.
  }
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;
    void registerServiceWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== "PUSH_RECEIVED") return;
      void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      playNotificationChime();
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [queryClient]);

  return children;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
