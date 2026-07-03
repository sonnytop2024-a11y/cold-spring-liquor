import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = () => new Resend(process.env.RESEND_API_KEY ?? "");
const LOGO_URL = "https://coldspringliquor.com/Logo.PNG";
const STORE_URL = "https://coldspringliquor.com";

export async function POST(req: NextRequest) {
const eta = new Date(Date.now() + 30 * 60 * 1000).toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Order Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:24px 12px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- ── HEADER ── -->
    <tr><td style="background:#ffffff;border-radius:20px 20px 0 0;padding:32px 40px 20px;text-align:center;border-bottom:1px solid #f3f4f6;">
      <!-- Logo image on white background -->
      <img src="${LOGO_URL}" alt="Cold Spring Liquor" width="160" height="auto"
        style="display:block;margin:0 auto 20px;max-width:160px;height:auto;" />
      <!-- Dark title block -->
      <div style="background:#0a0a0a;border-radius:14px;padding:22px 32px;">
        <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
          Order Confirmed! 🎉
        </h1>
        <p style="margin:0;color:#9ca3af;font-size:14px;letter-spacing:0.5px;">
          Order <span style="color:#f97316;font-weight:700;">#CSL-PREVIEW</span>
        </p>
      </div>
    </td></tr>

    <!-- ── ORANGE ACCENT BAR ── -->
    <tr><td style="background:#f97316;height:4px;"></td></tr>

    <!-- ── BODY ── -->
    <tr><td style="background:#ffffff;padding:36px 40px;">

      <!-- Greeting -->
      <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.6;">
        Hi <strong style="color:#0a0a0a;">Son</strong>, thank you for your order at Cold Spring Liquor!
        We're getting it ready and will be on our way to you soon. 🚗
      </p>

      <!-- ETA Box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid #f97316;border-radius:14px;padding:18px 24px;">
        <p style="margin:0 0 4px;font-size:11px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">
          📦 Estimated Delivery
        </p>
        <p style="margin:0;font-size:20px;color:#ea580c;font-weight:800;">${eta} CT</p>
      </td></tr>
      </table>

      <!-- Section: Your Items -->
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
        🛒 Your Items
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;font-weight:500;">
            Casamigos Blanco Tequila, 750mL
            <span style="color:#9ca3af;font-weight:400;"> ×2</span>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;text-align:right;font-weight:600;white-space:nowrap;">
            $79.98
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;font-weight:500;">
            Tito's Handmade Vodka, 1L
            <span style="color:#9ca3af;font-weight:400;"> ×1</span>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;text-align:right;font-weight:600;white-space:nowrap;">
            $32.99
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;font-weight:500;">
            Blue Moon Belgian White, 6-pack
            <span style="color:#9ca3af;font-weight:400;"> ×1</span>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;text-align:right;font-weight:600;white-space:nowrap;">
            $11.99
          </td>
        </tr>
      </table>

      <!-- Totals -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:14px;padding:20px 24px;margin:24px 0;">
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:5px 0;">Subtotal</td>
          <td style="font-size:14px;color:#374151;text-align:right;padding:5px 0;">$124.96</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#7c3aed;padding:5px 0;">📦 Bundle Discount</td>
          <td style="font-size:14px;color:#7c3aed;text-align:right;padding:5px 0;">-$12.50</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#059669;padding:5px 0;">🏷️ Coupon (WELCOME10)</td>
          <td style="font-size:14px;color:#059669;text-align:right;padding:5px 0;">-$5.00</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:5px 0;">Tax (8.25%)</td>
          <td style="font-size:14px;color:#374151;text-align:right;padding:5px 0;">$8.90</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#059669;padding:5px 0;font-weight:600;">🚚 Delivery</td>
          <td style="font-size:14px;color:#059669;text-align:right;padding:5px 0;font-weight:600;">FREE</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:10px 0 0;">
            <div style="border-top:2px solid #e5e7eb;"></div>
          </td>
        </tr>
        <tr>
          <td style="font-size:19px;font-weight:800;color:#0a0a0a;padding-top:10px;">Total</td>
          <td style="font-size:19px;font-weight:800;color:#f97316;text-align:right;padding-top:10px;">$116.36</td>
        </tr>
      </table>

      <!-- Delivery Address -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr><td style="background:#f9fafb;border-radius:12px;padding:16px 20px;border-left:4px solid #f97316;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
          📍 Delivering To
        </p>
        <p style="margin:0;font-size:15px;color:#111827;font-weight:500;">1221 Sonny Dr, Leander, TX 78641</p>
      </td></tr>
      </table>

      <!-- CTA Button -->
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:8px 0 4px;">
        <a href="${STORE_URL}"
          style="display:inline-block;background:#f97316;color:#ffffff;font-weight:800;font-size:16px;padding:16px 48px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">
          Shop Again →
        </a>
      </td></tr>
      </table>

    </td></tr>

    <!-- ── FOOTER ── -->
    <tr><td style="background:#0a0a0a;border-radius:0 0 20px 20px;padding:28px 40px;text-align:center;">
      <img src="${LOGO_URL}" alt="Cold Spring Liquor" width="100" height="auto"
        style="display:block;margin:0 auto 16px;max-width:100px;height:auto;opacity:0.85;" />
      <p style="margin:0 0 6px;font-size:14px;color:#f97316;font-weight:700;">Cold Spring Liquor</p>
      <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
        📍 15609 Ronald Reagan Blvd Ste B100, Leander, TX 78641
      </p>
      <p style="margin:0 0 14px;font-size:13px;color:#9ca3af;">
        📞 <a href="tel:+15123377051" style="color:#9ca3af;text-decoration:none;">(512) 337-7051</a>
      </p>
      <p style="margin:0;font-size:11px;color:#4b5563;">
        You received this because you placed an order at
        <a href="${STORE_URL}" style="color:#f97316;text-decoration:none;">coldspringliquor.com</a>
      </p>
    </td></tr>

  </table>
  </td></tr>
  </table>

</body>
</html>`;

  try {
    const result = await resend().emails.send({
      from: "Cold Spring Liquor <orders@coldspringliquor.com>",
      to: "sonnytop2024@gmail.com",
      subject: `[PREVIEW] Order Confirmed — Cold Spring Liquor`,
      html,
    });
    return NextResponse.json({ success: true, id: result.data?.id });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
