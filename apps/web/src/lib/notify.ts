import webpush from "web-push";
import { dbGetSettings } from "./db";
import type { MockOrder } from "../app/api/_mock/store";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL   = "mailto:sonnytop2024@gmail.com";

export async function notifyNewOrder(order: MockOrder): Promise<void> {
  const settings = await dbGetSettings();
  await Promise.allSettled([
    sendTelegram(order, settings.telegramBotToken, settings.telegramChatId),
    sendPush(order, settings.pushSubscription ?? null),
  ]);
}

async function sendTelegram(
  order: MockOrder,
  token?: string,
  chatId?: string,
): Promise<void> {
  if (!token || !chatId) return;
  const lines = (order.items as { name: string; quantity: number }[])
    .map(i => `  • ${i.name} ×${i.quantity}`)
    .join("\n");
  const text =
    `🛒 *New Order #${order.orderNumber}*\n\n` +
    `${lines}\n\n` +
    `💰 Total: *$${order.total.toFixed(2)}*\n` +
    `👤 ${order.customerName}  📞 ${order.customerPhone}\n` +
    `📍 ${(order.deliveryAddress as { street?: string })?.street ?? ""}`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    cache: "no-store",
  }).catch(() => {});
}

async function sendPush(
  order: MockOrder,
  sub: Record<string, unknown> | null,
): Promise<void> {
  if (!sub || !VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    const payload = JSON.stringify({
      title: `New Order #${order.orderNumber}`,
      body: `$${order.total.toFixed(2)} — ${order.customerName}`,
      url: "/orders",
    });
    await webpush.sendNotification(sub as unknown as Parameters<typeof webpush.sendNotification>[0], payload);
  } catch {
    // Subscription may have expired — ignore
  }
}
