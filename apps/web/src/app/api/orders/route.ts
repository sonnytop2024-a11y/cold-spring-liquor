import { NextRequest, NextResponse } from "next/server";
import { store, createOrderNumber } from "../_mock/store";
import { TAX_RATE } from "../_mock/data";
import { getDeliveryTiming } from "@/lib/deliveryTiming";
import { dbGetUserById, dbSaveUser, dbCreateOrder, dbGetAllOrders } from "@/lib/db";
import { notifyNewOrder } from "@/lib/notify";
import { verifySessionToken } from "@/lib/session";
import { estimateDeliveryFromStoreAsync } from "@/lib/deliveryEstimate";
import { calcDiscounts } from "@/lib/discountRules";
import type { MockOrder } from "../_mock/store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    items, deliveryAddress, billingAddress, billingAddressSameAsDelivery,
    customerName, customerEmail, customerPhone,
    couponDiscount = 0, couponCode,
  } = body;

  const sessionToken = req.cookies.get("csl-session")?.value;
  const userId = sessionToken ? verifySessionToken(sessionToken) : null;
  const sessionUser = userId ? await dbGetUserById(userId) : null;
  const customerId = sessionUser?.id ?? body.customerId ?? null;

  // Enrich items with bundleEligible flag from product store
  const enrichedItems = items.map((i: any) => {
    const product = store.getProduct(i.productId);
    return { price: i.price, salePrice: null, bundleEligible: product?.bundleEligible ?? false, quantity: i.quantity };
  });
  const bundleTiers = store.getActiveBundleTiers();
  const { subtotal, bundleDiscount } = calcDiscounts(enrichedItems, bundleTiers);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const safeBundleDiscount = Math.round(bundleDiscount * 100) / 100;
  const total = Math.round(Math.max(0, subtotal - safeBundleDiscount - couponDiscount + tax) * 100) / 100;

  const id = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nowDate = new Date();
  const nowStr = nowDate.toISOString();
  const timing = getDeliveryTiming(nowDate);
  const { distanceMiles, etaMinutes } = await estimateDeliveryFromStoreAsync(deliveryAddress ?? {});

  if (distanceMiles > 10) {
    return NextResponse.json(
      { error: `Sorry, we only deliver within 10 miles of our store. Your address is ${distanceMiles} miles away.` },
      { status: 422 }
    );
  }

  const order: MockOrder = {
    id, orderNumber: createOrderNumber(), status: "pending",
    items, subtotal, bundleDiscount: safeBundleDiscount, couponDiscount, couponCode, tax, total,
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
    createdAt: nowStr, updatedAt: nowStr,
    estimatedDelivery: timing.estimatedDelivery.toISOString(),
  };

  await dbCreateOrder(order);
  notifyNewOrder(order).catch(() => {}); // fire-and-forget, never block the response

  if (couponCode) store.incrementCouponUsage(couponCode);

  // Save delivery address to user profile
  if (sessionUser && deliveryAddress?.street) {
    const updated = {
      ...sessionUser,
      deliveryAddress,
      billingAddress: billingAddressSameAsDelivery ? deliveryAddress : (billingAddress ?? undefined),
      billingAddressSameAsDelivery: billingAddressSameAsDelivery ?? true,
    };
    await dbSaveUser(updated);
  }

  // Award CS Reward points: 10 pts per $1
  if (sessionUser) {
    const pts = Math.floor(total * 10);
    const updated = {
      ...sessionUser,
      points: Math.max(0, sessionUser.points + pts),
    };
    if (updated.points >= 3000) updated.tier = "Platinum";
    else if (updated.points >= 1500) updated.tier = "Gold";
    else if (updated.points >= 500) updated.tier = "Silver";
    else updated.tier = "Bronze";
    await dbSaveUser(updated);
  }

  return NextResponse.json(order, { status: 201 });
}

export async function GET() {
  return NextResponse.json(await dbGetAllOrders());
}
