import { create } from "zustand";
import { persist } from "zustand/middleware";

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
          } else {
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
