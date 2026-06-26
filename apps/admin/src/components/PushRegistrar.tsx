"use client";

import { useEffect } from "react";
import { API } from "@/lib/api";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Auto-registers push if permission already granted and VAPID key is available.
// Does NOT prompt for permission — that's done via the Settings page button.
export function PushRegistrar() {
  useEffect(() => {
    if (!VAPID_PUBLIC) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        // Only subscribe if permission already granted (don't auto-prompt)
        if (Notification.permission !== "granted") return;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        }));
        await fetch(`${API}/admin/push-subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  return null;
}

// Call this from the Settings page "Enable Push" button
export async function enablePushNotifications(): Promise<"granted" | "denied" | "unsupported"> {
  if (!VAPID_PUBLIC) return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm as "denied";

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    }));
    await fetch("/api/admin/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
    return "granted";
  } catch {
    return "denied";
  }
}

export async function disablePushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (reg) {
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  }
  await fetch("/api/admin/push-subscribe", { method: "DELETE" }).catch(() => {});
}
