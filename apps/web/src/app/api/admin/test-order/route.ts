import { NextRequest, NextResponse } from "next/server";
import { store, createOrderNumber } from "../../_mock/store";
import type { MockOrder } from "../../_mock/store";
import { TAX_RATE } from "../../_mock/data";
import { dbCreateOrder } from "@/lib/db";
import { notifyNewOrder } from "@/lib/notify";

const TEST_ADDRESS = {
  street: "103 E Market St",
  city: "Leander",
  state: "TX",
  zip: "78641",
};

export async function POST(req: NextRequest) {
const allProducts = store.getAllProducts().slice(0, 50);
  const picks = allProducts.filter(p => p.price > 0).slice(0, 3);

  if (picks.length === 0) {
    return NextResponse.json({ error: "No products found to create test order" }, { status: 500 });
  }

  const items = picks.map(p => ({
    productId: p.id,
    name: p.name,
    price: p.price,
    quantity: 1,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const nowStr = new Date().toISOString();
  const estimatedDelivery = new Date(Date.now() + 45 * 60 * 1000).toISOString();

  const order: MockOrder = {
    id: `test_order_${Date.now()}`,
    orderNumber: `TEST-${createOrderNumber()}`,
    status: "pending",
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    bundleDiscount: 0,
    couponDiscount: 0,
    tax,
    total,
    deliveryFee: 0,
    deliveryType: "same-day",
    deliveryAddress: TEST_ADDRESS,
    billingAddress: TEST_ADDRESS,
    billingAddressSameAsDelivery: true,
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "512-555-0100",
    customerId: null,
    driverId: null,
    distanceMiles: 3.2,
    etaMinutes: 25,
    createdAt: nowStr,
    updatedAt: nowStr,
    estimatedDelivery,
  };

  await dbCreateOrder(order);
  await notifyNewOrder(order).catch(() => {});

  return NextResponse.json(order, { status: 201 });
}
