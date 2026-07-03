/* eslint-disable @typescript-eslint/no-explicit-any */
import { store, createOrderNumber } from "../app/api/_mock/store";
import { TAX_RATE } from "../app/api/_mock/data";
import { getDeliveryTiming } from "./deliveryTiming";
import { dbGetUserById, dbSaveUser, dbCreateOrder, dbGetGiftCard, dbSaveGiftCard } from "./db";
import { notifyNewOrder } from "./notify";
import { sendOrderConfirmation } from "./email";
import { verifySessionToken } from "./session";
import { estimateDeliveryFromStoreAsync } from "./deliveryEstimate";
import { calcDiscounts } from "./discountRules";
import type { MockOrder } from "../app/api/_mock/store";

export interface OrderInput {
  items: any[];
  deliveryAddress: any;
  billingAddress?: any;
  billingAddressSameAsDelivery?: boolean;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  couponDiscount?: number;
  couponCode?: string | null;
  rewardsDiscount?: number;
  rewardsPointsToRedeem?: number;
  giftCardCode?: string | null;
  giftCardAmount?: number;
  customerId?: string | null;
  paymentMethod?: string;
  [key: string]: any;
}

export interface ProcessOrderResult {
  order?: MockOrder;
  error?: string;
  status?: number;
}

export async function processOrder(
  body: OrderInput,
  sessionToken?: string | null,
): Promise<ProcessOrderResult> {
  const {
    items,
    deliveryAddress,
    billingAddress,
    billingAddressSameAsDelivery,
    customerName,
    customerEmail,
    customerPhone,
    couponDiscount = 0,
    couponCode,
    rewardsDiscount = 0,
    rewardsPointsToRedeem = 0,
    giftCardCode,
    giftCardAmount = 0,
  } = body;

  const userId = sessionToken ? verifySessionToken(sessionToken) : null;
  const sessionUser = userId ? await dbGetUserById(userId) : null;
  const customerId = sessionUser?.id ?? body.customerId ?? null;

  const enrichedItems = items.map((i: any) => {
    const product = store.getProduct(i.productId);
    return { price: i.price, salePrice: null, bundleEligible: product?.bundleEligible ?? false, quantity: i.quantity };
  });
  const bundleTiers = store.getActiveBundleTiers();
  const { subtotal, bundleDiscount } = calcDiscounts(enrichedItems, bundleTiers);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const safeBundleDiscount = Math.round(bundleDiscount * 100) / 100;
  const total = Math.round(Math.max(0, subtotal - safeBundleDiscount - couponDiscount - rewardsDiscount - giftCardAmount + tax) * 100) / 100;

  const { distanceMiles, etaMinutes } = await estimateDeliveryFromStoreAsync(deliveryAddress ?? {});
  if (distanceMiles > 10) {
    return {
      error: `Sorry, we only deliver within 10 miles of our store. Your address is ${distanceMiles} miles away.`,
      status: 422,
    };
  }

  const nowDate = new Date();
  const nowStr = nowDate.toISOString();
  const timing = getDeliveryTiming(nowDate);

  const order: MockOrder = {
    id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    orderNumber: createOrderNumber(),
    status: "pending",
    items,
    subtotal,
    bundleDiscount: safeBundleDiscount,
    couponDiscount,
    couponCode: couponCode ?? undefined,
    rewardsDiscount,
    rewardsPointsToRedeem,
    giftCardCode: giftCardCode ?? undefined,
    giftCardAmount,
    paymentMethod: body.paymentMethod ?? "stripe",
    stripePaymentIntentId: body.stripePaymentIntentId ?? undefined,
    paypalOrderId: body.paypalOrderId ?? undefined,
    tax,
    total,
    deliveryFee: 0,
    deliveryType: timing.type,
    deliveryAddress,
    billingAddress: billingAddressSameAsDelivery ? deliveryAddress : (billingAddress ?? deliveryAddress),
    billingAddressSameAsDelivery: billingAddressSameAsDelivery ?? true,
    customerName: sessionUser?.name ?? customerName ?? "Guest",
    customerEmail: sessionUser?.email ?? customerEmail ?? "",
    customerPhone: sessionUser?.phone ?? customerPhone ?? "",
    customerId,
    driverId: null,
    distanceMiles,
    etaMinutes,
    createdAt: nowStr,
    updatedAt: nowStr,
    // same-day ETA is set only after admin/driver accepts (confirmed status)
    // next-morning ETA is a fixed future date — set now so customer knows when to expect
    estimatedDelivery: timing.type === "next-morning" ? timing.estimatedDelivery.toISOString() : null,
  };

  await dbCreateOrder(order);
  await notifyNewOrder(order).catch(() => {});
  sendOrderConfirmation(order).catch(() => {});

  if (couponCode) store.incrementCouponUsage(couponCode);

  if (giftCardCode && giftCardAmount > 0) {
    try {
      const card = await dbGetGiftCard(giftCardCode);
      if (card) {
        // Only deduct what was actually charged (order could be < gift card balance)
        const totalBeforeGift = Math.round((subtotal - safeBundleDiscount - couponDiscount - rewardsDiscount + tax) * 100) / 100;
        const actualDeduction = Math.min(giftCardAmount, Math.max(0, totalBeforeGift));
        const newBalance = Math.round(Math.max(0, card.remainingBalance - actualDeduction) * 100) / 100;
        await dbSaveGiftCard({ ...card, remainingBalance: newBalance, status: newBalance <= 0 ? "redeemed" : "partial" });
      }
    } catch {}
  }

  if (sessionUser) {
    // Earn points on subtotal (items value), not total paid — gift card/discount shouldn't reduce points earned
    const safePoints = (rewardsPointsToRedeem > 0 && sessionUser.points >= rewardsPointsToRedeem) ? rewardsPointsToRedeem : 0;
    const pts = Math.floor(subtotal);
    const updated = {
      ...sessionUser,
      points: Math.max(0, sessionUser.points + pts - safePoints),
      // Update saved address in one shot to avoid double-save overwrite
      ...(deliveryAddress?.street ? {
        deliveryAddress,
        billingAddress: billingAddressSameAsDelivery ? deliveryAddress : (billingAddress ?? deliveryAddress),
        billingAddressSameAsDelivery: billingAddressSameAsDelivery ?? true,
      } : {}),
    };
    if (updated.points >= 3000) updated.tier = "Platinum";
    else if (updated.points >= 1500) updated.tier = "Gold";
    else if (updated.points >= 500) updated.tier = "Silver";
    else updated.tier = "Bronze";
    await dbSaveUser(updated);
  }

  return { order };
}
