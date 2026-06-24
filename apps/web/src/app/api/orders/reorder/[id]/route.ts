import { NextRequest, NextResponse } from "next/server";
import { store } from "../../../_mock/store";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = store.getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "delivered") return NextResponse.json({ error: "Only delivered orders can be reordered" }, { status: 400 });

  const validItems: {
    product: ReturnType<typeof store.getProduct>;
    quantity: number;
    originalPrice: number;
    currentPrice: number;
    priceChanged: boolean;
  }[] = [];

  const removedItems: { name: string; quantity: number; reason: "out_of_stock" | "not_found" }[] = [];

  for (const item of order.items) {
    const product = store.getProduct(item.productId ?? item.name);

    if (!product) {
      removedItems.push({ name: item.name, quantity: item.quantity, reason: "not_found" });
      continue;
    }
    if (!product.inStock || product.stockQty <= 0) {
      removedItems.push({ name: item.name, quantity: item.quantity, reason: "out_of_stock" });
      continue;
    }

    const currentPrice = product.salePrice ?? product.price;
    validItems.push({
      product,
      quantity: Math.min(item.quantity, product.stockQty),
      originalPrice: item.price,
      currentPrice,
      priceChanged: Math.abs(currentPrice - item.price) >= 0.01,
    });
  }

  return NextResponse.json({
    validItems,
    removedItems,
    deliveryAddress: order.deliveryAddress ?? null,
    originalOrderNumber: order.orderNumber,
    hasWarnings: removedItems.length > 0 || validItems.some(i => i.priceChanged),
  });
}
