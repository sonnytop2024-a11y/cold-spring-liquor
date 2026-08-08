"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { fetchProductBySlug } from "@/lib/api/products";

// The cart persists a SNAPSHOT of each product from add-to-cart time, so an
// admin edit (pre-order date changed/removed, stock, pickup-only flag) never
// reached open carts (anh Sơn, 09/08: đổi ngày available mà cart không
// update). This refreshes those live-changing fields whenever the cart UI
// becomes visible. Prices are deliberately NOT touched here.
export function useRefreshCartProducts(enabled: boolean) {
  const items = useCartStore((s) => s.items);
  const syncProductInfo = useCartStore((s) => s.syncProductInfo);
  const lastRun = useRef(0);

  useEffect(() => {
    if (!enabled || items.length === 0) return;
    // At most once per 30s — opening/closing the drawer repeatedly shouldn't
    // hammer the API
    if (Date.now() - lastRun.current < 30_000) return;
    lastRun.current = Date.now();

    let alive = true;
    for (const it of items) {
      fetchProductBySlug(it.product.slug)
        .then((fresh) => {
          if (!alive || !fresh) return;
          syncProductInfo(it.product.id, {
            availableFrom: fresh.availableFrom,
            stockQty: fresh.stockQty,
            inStock: fresh.inStock,
            pickupOnly: fresh.pickupOnly,
          });
        })
        .catch(() => {});
    }
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
