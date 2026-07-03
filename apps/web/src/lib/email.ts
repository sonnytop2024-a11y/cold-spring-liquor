import { Resend } from "resend";
import type { MockOrder } from "../app/api/_mock/store";

let _resend: Resend | null = null;
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  if (!_resend) _resend = new Resend(key);
  return _resend;
}
const FROM = "Cold Spring Liquor <orders@coldspringliquor.com>";
const STORE_URL = "https://coldspringliquor.com";
const LOGO_URL = "https://coldspringliquor.com/Logo.PNG";
const STORE_ADDRESS = "15609 Ronald Reagan Blvd Ste B100, Leander, TX 78641";
const STORE_PHONE = "(512) 337-7051";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// Shared pickup blocks — used in confirmation + ready emails
function pickupInfoBlock(order: MockOrder): string {
  const win = order.pickupWindow;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr><td style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid #f97316;border-radius:14px;padding:18px 24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">🏬 Pick Up In Store</p>
      ${win ? `<p style="margin:0 0 8px;font-size:20px;color:#ea580c;font-weight:800;">${win.dateLabel} · ${win.label} CT</p>` : ""}
      <p style="margin:0;font-size:14px;color:#111827;font-weight:600;">Cold Spring Liquor</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">${STORE_ADDRESS}</p>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr><td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:1px;">🪪 What to bring</p>
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.7;">
        ✓ A valid government-issued photo ID<br>
        ✓ The person picking up must be <strong>21 or older</strong><br>
        ✓ Name on the ID should match the order
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">We will hold your order for 7 days post pickup date.</p>
    </td></tr></table>`;
}

function orderConfirmationHtml(order: MockOrder): string {
  const isPickup = order.orderType === "pickup";
  const items = (order.items as Array<{ name: string; quantity: number; price: number; salePrice?: number | null }>) ?? [];
  const addr = order.deliveryAddress as { street?: string; city?: string; state?: string; zip?: string } | null;
  const addrStr = addr ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(", ") : "";
  const firstName = order.customerName.split(" ")[0];
  const eta = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })
    : "";

  const itemRows = items.map(i => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;font-weight:500;">
        ${i.name} <span style="color:#9ca3af;font-weight:400;">×${i.quantity}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;text-align:right;font-weight:600;white-space:nowrap;">
        ${formatCurrency((i.salePrice ?? i.price) * i.quantity)}
      </td>
    </tr>`).join("");

  const discountRows = [
    order.bundleDiscount > 0 ? `<tr><td style="font-size:14px;color:#7c3aed;padding:5px 0;">📦 Bundle Discount</td><td style="font-size:14px;color:#7c3aed;text-align:right;padding:5px 0;">-${formatCurrency(order.bundleDiscount)}</td></tr>` : "",
    order.couponDiscount > 0 ? `<tr><td style="font-size:14px;color:#059669;padding:5px 0;">🏷️ Coupon${order.couponCode ? ` (${order.couponCode})` : ""}</td><td style="font-size:14px;color:#059669;text-align:right;padding:5px 0;">-${formatCurrency(order.couponDiscount)}</td></tr>` : "",
    (order.rewardsDiscount ?? 0) > 0 ? `<tr><td style="font-size:14px;color:#7c3aed;padding:5px 0;">🏆 Rewards</td><td style="font-size:14px;color:#7c3aed;text-align:right;padding:5px 0;">-${formatCurrency(order.rewardsDiscount ?? 0)}</td></tr>` : "",
    (order.giftCardAmount ?? 0) > 0 ? `<tr><td style="font-size:14px;color:#059669;padding:5px 0;">🎁 Gift Card${order.giftCardCode ? ` (${order.giftCardCode})` : ""}</td><td style="font-size:14px;color:#059669;text-align:right;padding:5px 0;">-${formatCurrency(order.giftCardAmount ?? 0)}</td></tr>` : "",
  ].join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:24px 12px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER: white bg with logo -->
  <tr><td style="background:#ffffff;border-radius:20px 20px 0 0;padding:32px 40px 20px;text-align:center;border-bottom:1px solid #f3f4f6;">
    <img src="${LOGO_URL}" alt="Cold Spring Liquor" width="160" height="auto" style="display:block;margin:0 auto 20px;max-width:160px;height:auto;" />
    <div style="background:#0a0a0a;border-radius:14px;padding:22px 32px;">
      <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Order Confirmed! 🎉</h1>
      <p style="margin:0;color:#9ca3af;font-size:14px;">Order <span style="color:#f97316;font-weight:700;">#${order.orderNumber}</span></p>
    </div>
  </td></tr>

  <!-- ORANGE BAR -->
  <tr><td style="background:#f97316;height:4px;"></td></tr>

  <!-- BODY -->
  <tr><td style="background:#ffffff;padding:36px 40px;">

    <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.6;">
      Hi <strong style="color:#0a0a0a;">${firstName}</strong>, thank you for your order at Cold Spring Liquor!
      ${isPickup ? "We're getting it ready for pick up — we'll email you the moment it's ready. 🛍️" : "We're getting it ready and will be on our way to you soon. 🚗"}
    </p>

    ${isPickup ? pickupInfoBlock(order) : eta ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid #f97316;border-radius:14px;padding:18px 24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">📦 Estimated Delivery</p>
      <p style="margin:0;font-size:20px;color:#ea580c;font-weight:800;">${eta} CT</p>
    </td></tr></table>` : ""}

    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">🛒 Your Items</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">${itemRows}</table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:14px;padding:20px 24px;margin:24px 0;">
      <tr><td style="font-size:14px;color:#6b7280;padding:5px 0;">Subtotal</td><td style="font-size:14px;color:#374151;text-align:right;padding:5px 0;">${formatCurrency(order.subtotal)}</td></tr>
      ${discountRows}
      ${(order.pickupDiscount ?? 0) > 0 ? `<tr><td style="font-size:14px;color:#059669;padding:5px 0;font-weight:600;">🏬 Pick Up Discount (−10%)</td><td style="font-size:14px;color:#059669;text-align:right;padding:5px 0;font-weight:600;">-${formatCurrency(order.pickupDiscount ?? 0)}</td></tr>` : ""}
      <tr><td style="font-size:14px;color:#6b7280;padding:5px 0;">Tax (8.25%)</td><td style="font-size:14px;color:#374151;text-align:right;padding:5px 0;">${formatCurrency(order.tax)}</td></tr>
      ${isPickup ? "" : `<tr><td style="font-size:14px;color:#059669;padding:5px 0;font-weight:600;">🚚 Delivery</td><td style="font-size:14px;color:#059669;text-align:right;padding:5px 0;font-weight:600;">FREE</td></tr>`}
      <tr><td colspan="2" style="padding:10px 0 0;"><div style="border-top:2px solid #e5e7eb;"></div></td></tr>
      <tr><td style="font-size:19px;font-weight:800;color:#0a0a0a;padding-top:10px;">Total</td><td style="font-size:19px;font-weight:800;color:#f97316;text-align:right;padding-top:10px;">${formatCurrency(order.total)}</td></tr>
    </table>

    ${addrStr ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td style="background:#f9fafb;border-radius:12px;padding:16px 20px;border-left:4px solid #f97316;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">📍 Delivering To</p>
      <p style="margin:0;font-size:15px;color:#111827;font-weight:500;">${addrStr}</p>
    </td></tr></table>` : ""}

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:8px 0 4px;">
      <a href="${STORE_URL}" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:800;font-size:16px;padding:16px 48px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">Shop Again →</a>
    </td></tr></table>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0a0a0a;border-radius:0 0 20px 20px;padding:28px 40px;text-align:center;">
    <img src="${LOGO_URL}" alt="Cold Spring Liquor" width="100" height="auto" style="display:block;margin:0 auto 16px;max-width:100px;height:auto;opacity:0.85;" />
    <p style="margin:0 0 6px;font-size:14px;color:#f97316;font-weight:700;">Cold Spring Liquor</p>
    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">📍 ${STORE_ADDRESS}</p>
    <p style="margin:0 0 14px;font-size:13px;color:#9ca3af;">📞 <a href="tel:+15123377051" style="color:#9ca3af;text-decoration:none;">${STORE_PHONE}</a></p>
    <p style="margin:0;font-size:11px;color:#4b5563;">You received this because you placed an order at <a href="${STORE_URL}" style="color:#f97316;text-decoration:none;">coldspringliquor.com</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function giftCardHtml(code: string, amount: number, senderName: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Gift Card</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <p style="margin:0 0 4px;color:#f97316;font-weight:800;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Cold Spring Liquor</p>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">You've Got a Gift Card! 🎁</h1>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">From ${senderName}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;">

          ${message ? `<div style="background:#fff7ed;border-left:4px solid #f97316;padding:14px 18px;border-radius:0 10px 10px 0;margin-bottom:28px;">
            <p style="margin:0;font-size:15px;color:#374151;font-style:italic;">"${message}"</p>
            <p style="margin:6px 0 0;font-size:13px;color:#9a3412;font-weight:600;">— ${senderName}</p>
          </div>` : ""}

          <!-- Gift Card Visual -->
          <div style="background:linear-gradient(135deg,#111827 0%,#1f2937 50%,#0f172a 100%);border-radius:16px;padding:28px 32px;margin-bottom:28px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;">Gift Card Value</p>
            <p style="margin:0 0 20px;font-size:52px;font-weight:900;color:#f97316;">${formatCurrency(amount)}</p>
            <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:12px 24px;display:inline-block;">
              <p style="margin:0 0 2px;font-size:11px;color:#6b7280;letter-spacing:2px;">YOUR CODE</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:4px;font-family:monospace;">${code}</p>
            </div>
            <p style="margin:14px 0 0;font-size:12px;color:#4b5563;">Valid for any purchase · Never expires</p>
          </div>

          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;text-align:center;">Enter the code above at checkout under <strong style="color:#111827;">Gift Cards</strong></p>

          <!-- CTA -->
          <div style="text-align:center;">
            <a href="${STORE_URL}" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">Start Shopping →</a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f3f4f6;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Cold Spring Liquor · Leander, TX 78641</p>
          <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">Redeemable at coldspringliquor.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmation(order: MockOrder): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const email = order.customerEmail;
  if (!email) return;
  const isPickup = order.orderType === "pickup";
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: isPickup
        ? `Pick Up Order Confirmed #${order.orderNumber} — Cold Spring Liquor`
        : `Order Confirmed #${order.orderNumber} — Cold Spring Liquor`,
      html: orderConfirmationHtml(order),
    });
  } catch (e) {
    console.error("[email] sendOrderConfirmation failed:", e);
  }
}

function pickupReadyHtml(order: MockOrder): string {
  const firstName = order.customerName.split(" ")[0];
  const win = order.pickupWindow;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ready for Pick Up</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:24px 12px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="background:#ffffff;border-radius:20px 20px 0 0;padding:32px 40px 20px;text-align:center;border-bottom:1px solid #f3f4f6;">
    <img src="${LOGO_URL}" alt="Cold Spring Liquor" width="160" height="auto" style="display:block;margin:0 auto 20px;max-width:160px;height:auto;" />
    <div style="background:#0a0a0a;border-radius:14px;padding:22px 32px;">
      <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Your Order is Ready! 🛍️</h1>
      <p style="margin:0;color:#9ca3af;font-size:14px;">Order <span style="color:#f97316;font-weight:700;">#${order.orderNumber}</span></p>
    </div>
  </td></tr>
  <tr><td style="background:#f97316;height:4px;"></td></tr>

  <tr><td style="background:#ffffff;padding:36px 40px;">
    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
      Hi <strong style="color:#0a0a0a;">${firstName}</strong>, great news — your order is packed and <strong>ready for pick up</strong>!
      ${win ? `Please visit us during your selected window: <strong style="color:#ea580c;">${win.dateLabel} · ${win.label} CT</strong>.` : "Please visit us during your selected pickup window."}
    </p>
    ${pickupInfoBlock(order)}
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:8px 0 4px;">
      <a href="${STORE_URL}/track/${order.id}" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:800;font-size:16px;padding:16px 48px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">View My Order →</a>
    </td></tr></table>
  </td></tr>

  <tr><td style="background:#0a0a0a;border-radius:0 0 20px 20px;padding:28px 40px;text-align:center;">
    <p style="margin:0 0 6px;font-size:14px;color:#f97316;font-weight:700;">Cold Spring Liquor</p>
    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">📍 ${STORE_ADDRESS}</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">📞 <a href="tel:+15123377051" style="color:#9ca3af;text-decoration:none;">${STORE_PHONE}</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// Returns true if the email was actually sent (admin shows "Email Sent ✓")
export async function sendPickupReady(order: MockOrder): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const email = order.customerEmail;
  if (!email) return false;
  try {
    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Your order is ready for pick up — #${order.orderNumber}`,
      html: pickupReadyHtml(order),
    });
    return true;
  } catch (e) {
    console.error("[email] sendPickupReady failed:", e);
    return false;
  }
}

export async function sendGiftCardEmail(
  code: string,
  amount: number,
  recipientEmail: string,
  senderName: string,
  message: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await getResend().emails.send({
      from: FROM,
      to: recipientEmail,
      subject: `${senderName} sent you a $${amount} gift card 🎁`,
      html: giftCardHtml(code, amount, senderName, message),
    });
  } catch (e) {
    console.error("[email] sendGiftCardEmail failed:", e);
  }
}
