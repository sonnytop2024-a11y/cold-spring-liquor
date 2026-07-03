import { NextRequest, NextResponse } from "next/server";
import { dbGetUserByEmail, dbCreateUser, dbSaveUser, dbCreateOrder, dbGetUserByEmail as checkEmail } from "@/lib/db";
import { createOrderNumber } from "../../_mock/store";
import type { MockUser, MockOrder } from "../../_mock/store";

// Password hashing (same as register route)
function mockHash(s: string) { return Buffer.from(s).toString("base64"); }

const TEST_EMAIL = "test@coldspringliquor.com";
const TEST_PASSWORD = "TestCSL2024!";
const TEST_PHONE = "5125550199";
const TEST_DOB = "1990-01-15";

const DELIVERY_ADDRESS = {
  street: "1221 Sonny Dr",
  city: "Leander",
  state: "TX",
  zip: "78641",
};

const TAX_RATE = 0.0825;

function makeOrder(overrides: {
  id: string; customerId: string; items: MockOrder["items"];
  subtotal: number; couponDiscount?: number; couponCode?: string;
  bundleDiscount?: number; rewardsDiscount?: number;
  createdAtOffset: number; // hours ago
  status: MockOrder["status"];
  driverId?: string | null;
}): MockOrder {
  const {
    id, customerId, items, subtotal,
    couponDiscount = 0, couponCode,
    bundleDiscount = 0,
    rewardsDiscount = 0,
    createdAtOffset, status,
    driverId = null,
  } = overrides;

  const effectiveSubtotal = subtotal - rewardsDiscount; // absorb rewards into couponDiscount field
  const tax = Math.round(effectiveSubtotal * TAX_RATE * 100) / 100;
  const total = Math.round(Math.max(0, effectiveSubtotal - bundleDiscount - couponDiscount + tax) * 100) / 100;
  const createdAt = new Date(Date.now() - createdAtOffset * 60 * 60 * 1000).toISOString();
  const estimatedDelivery = new Date(new Date(createdAt).getTime() + 30 * 60 * 1000).toISOString();

  return {
    id,
    orderNumber: createOrderNumber(),
    status,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    bundleDiscount,
    couponDiscount: couponDiscount + rewardsDiscount, // rewards absorbed here for display
    ...(couponCode ? { couponCode } : {}),
    tax,
    total,
    deliveryFee: 0,
    deliveryType: "same-day",
    deliveryAddress: DELIVERY_ADDRESS,
    billingAddress: DELIVERY_ADDRESS,
    billingAddressSameAsDelivery: true,
    customerName: "Test Customer [QA]",
    customerEmail: TEST_EMAIL,
    customerPhone: TEST_PHONE,
    customerId,
    driverId,
    distanceMiles: 2.4,
    etaMinutes: 22,
    createdAt,
    updatedAt: createdAt,
    estimatedDelivery,
  };
}

export async function POST(req: NextRequest) {
try {
    // ── 1. Create or update the test user ───────────────────────────────────────
    const existing = await dbGetUserByEmail(TEST_EMAIL);
    let userId: string;

    if (existing) {
      userId = existing.id;
      // Update points/tier to ensure test conditions
      const updated: MockUser = {
        ...existing,
        name: "Test Customer [QA]",
        points: 750,
        tier: "Silver",
        deliveryAddress: DELIVERY_ADDRESS,
        billingAddress: DELIVERY_ADDRESS,
        billingAddressSameAsDelivery: true,
        phone: TEST_PHONE,
      };
      await dbSaveUser(updated);
    } else {
      userId = `u_test_${Date.now()}`;
      const newUser: MockUser = {
        id: userId,
        name: "Test Customer [QA]",
        email: TEST_EMAIL,
        phone: TEST_PHONE,
        dob: TEST_DOB,
        passwordHash: mockHash(TEST_PASSWORD),
        points: 750,
        tier: "Silver",
        createdAt: new Date().toISOString(),
        deliveryAddress: DELIVERY_ADDRESS,
        billingAddress: DELIVERY_ADDRESS,
        billingAddressSameAsDelivery: true,
      };
      await dbCreateUser(newUser);
    }

    // ── 2. Create sample completed orders ────────────────────────────────────────

    const orders: MockOrder[] = [

      // Order 1: Regular order — delivered 3 days ago
      makeOrder({
        id: `test_ord_1_${userId}`,
        customerId: userId,
        status: "delivered",
        createdAtOffset: 72,
        items: [
          { productId: "p_titos_750", name: "Tito's Handmade Vodka 750mL", price: 22.99, quantity: 2 },
          { productId: "p_jd_1L", name: "Jack Daniel's Old No. 7 1L", price: 34.99, quantity: 1 },
        ],
        subtotal: 22.99 * 2 + 34.99,
      }),

      // Order 2: Flash Sale order — delivered 5 days ago
      makeOrder({
        id: `test_ord_2_${userId}`,
        customerId: userId,
        status: "delivered",
        createdAtOffset: 120,
        items: [
          { productId: "p_jimbeam_1L", name: "Jim Beam Orange 1L ⚡ Flash Deal", price: 24.99, quantity: 1 },
          { productId: "p_deepeddy_175", name: "Deep Eddy Peach Vodka 1.75L", price: 32.99, quantity: 1 },
        ],
        subtotal: 24.99 + 32.99,
      }),

      // Order 3: Bundle Deal (10% off) — delivered 8 days ago
      makeOrder({
        id: `test_ord_3_${userId}`,
        customerId: userId,
        status: "delivered",
        createdAtOffset: 192,
        items: [
          { productId: "p_titos_750", name: "Tito's Handmade Vodka 750mL", price: 22.99, quantity: 3 },
          { productId: "p_crown_750", name: "Crown Royal Canadian Whisky 750mL", price: 29.99, quantity: 2 },
        ],
        subtotal: 22.99 * 3 + 29.99 * 2,
        bundleDiscount: Math.round((22.99 * 3 + 29.99 * 2) * 0.10 * 100) / 100,
      }),

      // Order 4: Coupon WELCOME10 applied — delivered 10 days ago
      makeOrder({
        id: `test_ord_4_${userId}`,
        customerId: userId,
        status: "delivered",
        createdAtOffset: 240,
        items: [
          { productId: "p_makers_750", name: "Maker's Mark Bourbon 750mL", price: 31.99, quantity: 1 },
          { productId: "p_dripping_750", name: "Dripping Springs Original Vodka 750mL", price: 22.99, quantity: 1 },
        ],
        subtotal: 31.99 + 22.99,
        couponCode: "WELCOME10",
        couponDiscount: Math.round((31.99 + 22.99) * 0.10 * 100) / 100,
      }),

      // Order 5: Rewards redemption ($5 off absorbed as couponDiscount) — delivered 2 days ago
      makeOrder({
        id: `test_ord_5_${userId}`,
        customerId: userId,
        status: "delivered",
        createdAtOffset: 48,
        items: [
          { productId: "p_patron_750", name: "Patron Silver Tequila 750mL", price: 44.99, quantity: 1 },
          { productId: "p_casamigos_750", name: "Casamigos Blanco Tequila 750mL", price: 49.99, quantity: 1 },
        ],
        subtotal: 44.99 + 49.99,
        rewardsDiscount: 5,
      }),

      // Order 6: Out for delivery — 2 hours ago (for tracking test)
      makeOrder({
        id: `test_ord_6_${userId}`,
        customerId: userId,
        status: "out_for_delivery",
        createdAtOffset: 2,
        items: [
          { productId: "p_titos_175", name: "Tito's Handmade Vodka 1.75L", price: 39.99, quantity: 1 },
          { productId: "p_whiteclaw_12pk", name: "White Claw Variety Pack 12pk", price: 21.99, quantity: 1 },
        ],
        subtotal: 39.99 + 21.99,
        driverId: "driver_test_001",
      }),
    ];

    // Create all orders (skip if already exists — idempotent)
    let created = 0;
    let skipped = 0;
    for (const order of orders) {
      try {
        await dbCreateOrder(order);
        created++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Test account seeded successfully.",
      credentials: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        note: "Login at /auth/login with these credentials",
      },
      account: {
        id: userId,
        name: "Test Customer [QA]",
        points: 750,
        tier: "Silver",
        deliveryAddress: DELIVERY_ADDRESS,
      },
      orders: {
        created,
        skipped,
        summary: [
          "Order 1: Regular order (3 items) — delivered 3 days ago",
          "Order 2: Flash Sale order — delivered 5 days ago",
          "Order 3: Bundle Deal 10% off (5 items) — delivered 8 days ago",
          "Order 4: Coupon WELCOME10 applied — delivered 10 days ago",
          "Order 5: Rewards 250pts = $5 off — delivered 2 days ago",
          "Order 6: Out for delivery (active order for tracking test)",
        ],
      },
      testScenarios: {
        rewards: "750 pts available → test $5 (250pts) and $10 (500pts) redemption tiers",
        coupon: "Use code WELCOME10, SUMMER15, or CSL5 for new orders",
        reorder: "Use any delivered order to test Reorder flow",
        tracking: "Order 6 is out_for_delivery — test Order Tracking",
        flashSale: "Order 2 shows Flash Sale items in history",
        bundle: "Order 3 shows Bundle Deal discount in history",
      },
    });
  } catch (err) {
    console.error("[seed-test-account] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
