import { api } from "./api";

export type PushStatus = {
  enabled: boolean;
  subscriptions: number;
};

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function base64UrlToUint8Array(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
  return output.buffer as ArrayBuffer;
}

export async function getPushStatus(): Promise<PushStatus> {
  return api.get<PushStatus>("/push/status");
}

export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!pushSupported()) {
    return { ok: false, message: "Brauzeringiz push bildirishnomalarni qo‘llab-quvvatlamaydi." };
  }
  if (!window.isSecureContext) {
    return { ok: false, message: "Bildirishnomalar uchun HTTPS kerak." };
  }
  // Permission must be requested directly from the click handler (iOS/Safari).
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Bildirishnomalarga ruxsat berilmadi." };
  }
  const key = await api.get<{ enabled: boolean; public_key: string | null }>("/push/public-key");
  if (!key.enabled || !key.public_key) {
    return { ok: false, message: "Serverda VAPID kalitlari sozlanmagan." };
  }
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(key.public_key),
    });
  }
  await api.post("/push/subscribe", subscription.toJSON());
  return { ok: true, message: "Bildirishnomalar yoqildi." };
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await api.delete(`/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`).catch(() => undefined);
  await subscription.unsubscribe();
}

export async function sendTestPush(): Promise<number> {
  const result = await api.post<{ sent: number }>("/push/test");
  return result.sent;
}
