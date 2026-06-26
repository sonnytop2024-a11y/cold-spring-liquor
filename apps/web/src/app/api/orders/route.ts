import { NextRequest, NextResponse } from "next/server";
import { store, createOrderNumber } from "../_mock/store";
import { TAX_RATE } from "../_mock/data";
import { getDeliveryTiming } from "@/lib/deliveryTiming";
import { dbGetUserById, dbSaveUser, dbCreateOrder, dbGetAllOrders } from "@/lib/db";
import { verifySessionToken } from "@/lib/session";
import { estimateDeliveryFromStoreAsync } from "@/lib/deliveryEstimate";
import type { MockOrder } from "../_mock/store";

function calcBundleDiscount(totalQty: number, subtotal: number): number {
  const tiers = store.getActiveBundleTiers().sort((a, b) => b.minQty - a.minQty);
  for (const tier of tiers) {
    if (totalQty >= tier.minQty) return subtotal * (tier.discountPct / 100);
  }
  return 0;
}

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

  const subtotal = Math.round(items.reduce((acc: number, i: any) => acc + i.price * i.quantity, 0) * 100) / 100;
  const totalQty = items.reduce((acc: number, i: any) => acc + i.quantity, 0);
  const bundleDiscount = Math.round(calcBundleDiscount(totalQty, subtotal) * 100) / 100;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round(Math.max(0, subtotal - bundleDiscount - couponDiscount + tax) * 100) / 100;

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
    items, subtotal, bundleDiscount, couponDiscount, couponCode, tax, total,
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
