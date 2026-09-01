"use client";

import { useState } from "react";
import { FiBell, FiBellOff, FiVolume2, FiVolumeX } from "react-icons/fi";
import { useToast } from "@/components/common/toast-provider";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const SOUND_KEY = "dinks-on-us:notification-sound";

export function PushNotificationSettings() {
  const toast = useToast();
  const notifications = usePushNotifications();
  const [soundEnabled, setSoundEnabled] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(SOUND_KEY) === "on");

  async function toggleNotifications() {
    try {
      if (notifications.enabled) await notifications.disable();
      else await notifications.enable();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Notifications could not be updated.");
    }
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    toast.info(next ? "In-app notification sound enabled." : "In-app notification sound disabled.");
  }

  if (!notifications.supported) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={notifications.isPending} onClick={() => void toggleNotifications()}>
        {notifications.enabled ? <FiBellOff aria-hidden="true" /> : <FiBell aria-hidden="true" />}
        {notifications.isPending ? "Updating notifications…" : notifications.enabled ? "Disable device notifications" : "Enable device notifications"}
      </DropdownMenuItem>
      {notifications.permission === "granted" ? (
        <DropdownMenuItem onClick={toggleSound}>
          {soundEnabled ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
          {soundEnabled ? "Mute in-app sound" : "Enable in-app sound"}
        </DropdownMenuItem>
      ) : null}
    </>
  );
}
