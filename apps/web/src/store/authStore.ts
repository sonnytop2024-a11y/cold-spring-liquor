import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCartStore } from "./cartStore";

export interface SavedAddress {
  street: string; city: string; state: string; zip: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  points: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  createdAt: string;
  deliveryAddress?: SavedAddress;
  billingAddress?: SavedAddress;
  billingAddressSameAsDelivery?: boolean;
  googleId?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  loading: boolean;

  setUser: (user: AuthUser | null) => void;
  setLoading: (v: boolean) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updateProfile: (fields: Partial<AuthUser>) => Promise<AuthUser | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      loading: true,

      setUser: (user) => set({ user, isLoggedIn: !!user }),
      setLoading: (loading) => set({ loading }),

      logout: async () => {
        // Save cart to server before clearing
        const cart = useCartStore.getState();
        if (cart.items.length > 0) {
          try {
            await fetch("/api/auth/cart", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cart: cart.items }),
            });
          } catch {}
        }
        useCartStore.getState().clearCart();
        await fetch("/api/auth/logout", { method: "POST" });
        set({ user: null, isLoggedIn: false });
      },

      fetchMe: async () => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const { user } = await res.json();
            set({ user, isLoggedIn: !!user });
            // Load server cart on login — only if local cart is empty.
            // If local has items, local is authoritative (avoids deleted items
            // reappearing after refresh when server hasn't caught up yet).
            if (user) {
              try {
                const localItems = useCartStore.getState().items;
                if (localItems.length === 0) {
                  const cartRes = await fetch("/api/auth/cart");
                  if (cartRes.ok) {
                    const { cart: serverItems } = await cartRes.json();
                    if (Array.isArray(serverItems) && serverItems.length > 0) {
                      useCartStore.setState({ items: serverItems });
                    }
                  }
                }
              } catch {}
            }
          } else {
            // Only clear cart if a previously logged-in user's session truly
            // expired (401). Never touch a guest's cart — guests keep their
            // localStorage cart across refreshes.
            if (get().isLoggedIn && res.status === 401) {
              useCartStore.getState().clearCart();
            }
            set({ user: null, isLoggedIn: false });
          }
        } finally {
          set({ loading: false });
        }
      },

      updateProfile: async (fields) => {
        const res = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) return null;
        const { user } = await res.json();
        set({ user, isLoggedIn: true });
        return user;
      },
    }),
    {
      name: "csl-auth",
      partialize: (s) => ({ user: s.user, isLoggedIn: s.isLoggedIn }),
    }
  )
);
