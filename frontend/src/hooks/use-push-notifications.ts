"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/services/push/push-subscription-service";
import { decodeVapidPublicKey, registerServiceWorker } from "@/lib/pwa";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === "undefined" ? "default" : Notification.permission,
  );
  const [isPending, setIsPending] = useState(false);

  const supported = useMemo(
    () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(vapidPublicKey),
    [],
  );

  useEffect(() => {
    if (!supported) return;
    void registerServiceWorker().then((registration) => registration?.pushManager.getSubscription()).then((value) => setSubscription(value ?? null)).catch(() => undefined);
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported || !vapidPublicKey) throw new Error("Push notifications are not configured for this environment.");
    setIsPending(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") throw new Error("Allow notifications in your browser settings to receive reservation alerts.");
      const registration = await registerServiceWorker();
      if (!registration) throw new Error("This browser cannot register notifications.");
      const current = await registration.pushManager.getSubscription();
      const next = current ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidPublicKey(vapidPublicKey) as unknown as BufferSource });
      await savePushSubscription(next);
      setSubscription(next);
    } finally {
      setIsPending(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    if (!subscription) return;
    setIsPending(true);
    try {
      if (subscription.endpoint) await removePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
      setSubscription(null);
    } finally {
      setIsPending(false);
    }
  }, [subscription]);

  return { supported, permission, enabled: Boolean(subscription), isPending, enable, disable };
}
