import { NextRequest, NextResponse } from "next/server";
import { store, createOrderNumber } from "../_mock/store";
import { TAX_RATE } from "../_mock/data";
import { getDeliveryTiming } from "@/lib/deliveryTiming";
import type { MockOrder } from "../_mock/store";

function calcBundleDiscount(totalQty: number, subtotal: number): number {
  if (totalQty >= 6) return subtotal * 0.15;
  if (totalQty >= 3) return subtotal * 0.10;
  if (totalQty >= 2) return subtotal * 0.05;
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
  const sessionUser = sessionToken ? store.getUserBySession(sessionToken) : null;
  const customerId = sessionUser?.id ?? body.customerId ?? null;

  const subtotal = Math.round(items.reduce((acc: number, i: any) => acc + i.price * i.quantity, 0) * 100) / 100;
  const totalQty = items.reduce((acc: number, i: any) => acc + i.quantity, 0);
  const bundleDiscount = Math.round(calcBundleDiscount(totalQty, subtotal) * 100) / 100;
  const discountedSub = subtotal - bundleDiscount - couponDiscount;
  const tax = Math.round(discountedSub * TAX_RATE * 100) / 100;
  const total = Math.round(Math.max(0, discountedSub + tax) * 100) / 100;

  const id = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nowDate = new Date();
  const nowStr = nowDate.toISOString();
  const timing = getDeliveryTiming(nowDate);

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
    createdAt: nowStr, updatedAt: nowStr,
    estimatedDelivery: timing.estimatedDelivery.toISOString(),
  };

  store.saveOrder(order);

  if (couponCode) store.incrementCouponUsage(couponCode);

  if (customerId && deliveryAddress?.street) {
    store.updateUserProfile(customerId, {
      deliveryAddress,
      billingAddress: billingAddressSameAsDelivery ? deliveryAddress : (billingAddress ?? undefined),
      billingAddressSameAsDelivery: billingAddressSameAsDelivery ?? true,
    });
  }

  // Award CS Reward points: 10 pts per $1
  if (customerId) {
    store.updateUserPoints(customerId, Math.floor(total * 10));
  }

  return NextResponse.json(order, { status: 201 });
}

export async function GET() {
  return NextResponse.json(store.getAllOrders());
}
