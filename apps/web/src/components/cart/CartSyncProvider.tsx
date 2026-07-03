"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import type { CartItem } from "@/types";

type AnyItem = { product: { id: string } & Record<string, unknown>; quantity: number };

function mergeItems(local: CartItem[], server: AnyItem[]): CartItem[] {
  const merged: CartItem[] = [...local];
  for (const s of server) {
    if (!merged.find(l => l.product.id === s.product.id)) {
      merged.push(s as unknown as CartItem);
    }
  }
  return merged;
}

export function CartSyncProvider() {
  const items = useCartStore((s) => s.items);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const loading = useAuthStore((s) => s.loading);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRef = useRef<string | null>(null);

  const saveToServer = useCallback((toSave: CartItem[]) => {
    fetch("/api/auth/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart: toSave }),
    }).catch(() => {});
  }, []);

  const loadFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/cart");
      if (!res.ok) return;
      const { cart: serverItems } = await res.json();
      if (!Array.isArray(serverItems)) return;

      const localItems = useCartStore.getState().items;

      if (serverItems.length === 0) {
        // Server has empty cart — order was completed on another device, clear local too
        if (localItems.length > 0) useCartStore.setState({ items: [] });
        return;
      }

      const merged: CartItem[] = localItems.length === 0
        ? (serverItems as unknown as CartItem[])
        : mergeItems(localItems, serverItems as AnyItem[]);

      if (JSON.stringify(merged) !== JSON.stringify(localItems)) {
        useCartStore.setState({ items: merged });
      }
    } catch {}
  }, []);

  // Save to server when items change (debounced 150ms to batch rapid +/- taps)
  useEffect(() => {
    if (!isLoggedIn || loading) return;

    const serialized = JSON.stringify(items);
    if (serialized === prevRef.current) return;
    prevRef.current = serialized;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    // Always save — including empty cart — so deletions are reflected on server
    saveTimer.current = setTimeout(() => saveToServer(items), 150);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [items, isLoggedIn, loading, saveToServer]);

  // Load from server when tab becomes visible (cross-device sync)
  useEffect(() => {
    if (!isLoggedIn || loading) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") loadFromServer();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isLoggedIn, loading, loadFromServer]);

  return null;
}
