/* eslint-disable @typescript-eslint/no-explicit-any */
import { store, createOrderNumber } from "../app/api/_mock/store";
import { TAX_RATE } from "../app/api/_mock/data";
import { getDeliveryTiming } from "./deliveryTiming";
import { dbGetUserById, dbSaveUser, dbCreateOrder, dbGetGiftCard, dbSaveGiftCard, dbGetProduct, dbUpdateProduct } from "./db";
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

  // We are delivery-only. Reject placeholder/pickup addresses like "101 - Will Pick Up".
  const street: string = (deliveryAddress?.street ?? "").trim();
  const streetLower = street.toLowerCase().replace(/[^a-z ]/g, " ");
  const PICKUP_WORDS = ["pickup", "pick up", "will call", "willcall", "in store", "instore", "store pickup", "n a", "none"];
  if (PICKUP_WORDS.some(w => streetLower.includes(w))) {
    return {
      error: "We are a delivery-only service — in-store pickup is not available. Please enter a valid street address for delivery.",
      status: 422,
    };
  }
  if (!/^\d+\s+[A-Za-z]/.test(street)) {
    return {
      error: "Please provide a complete street address including your house or building number (e.g. 1221 Sonny Dr).",
      status: 422,
    };
  }

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
    // Prefer non-empty values — a logged-in user with a blank profile phone
    // must not wipe out the phone they typed at checkout
    customerName: sessionUser?.name || customerName || "Guest",
    customerEmail: sessionUser?.email || customerEmail || "",
    customerPhone: sessionUser?.phone || customerPhone || "",
    customerId,
    driverId: null,
    distanceMiles,
    etaMinutes,
    createdAt: nowStr,
    updatedAt: nowStr,
    // same-day ETA is set only after admin/driver accepts (confirmed status)
    // next-morning / before-opening ETA is a fixed future time — set now so customer knows when to expect
    estimatedDelivery: timing.type === "next-morning" || timing.isStoreClosed ? timing.estimatedDelivery.toISOString() : null,
  };

  await dbCreateOrder(order);

  // Deduct inventory for each purchased item
  for (const item of items) {
    try {
      const product = await dbGetProduct(item.productId);
      if (product) {
        const newQty = Math.max(0, (product.stockQty ?? 0) - item.quantity);
        await dbUpdateProduct(product.id, { stockQty: newQty, inStock: newQty > 0 });
      }
    } catch (e) {
      console.error("[processOrder] stock deduction failed for", item.productId, e);
    }
  }
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
