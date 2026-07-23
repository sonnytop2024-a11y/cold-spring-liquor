"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, CreditCard, Loader2, Tag, CheckCircle, ChevronDown, ChevronUp, User, CreditCard as BillingIcon, Clock, AlertTriangle, RefreshCw, Truck, Star, Gift, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCheckoutStore } from "@/store/checkoutStore";
import { calcDiscounts } from "@/lib/discountRules";
import { useRouter } from "next/navigation";
import { formatCurrency, MIN_ORDER, calcPointsValue } from "@/lib/utils";
import { formatPhoneUS } from "@/lib/phoneUtils";
import { getDeliveryTiming } from "@/lib/deliveryTiming";
import { getPickupWindows, isPickupDayOpen, pickupDateLabel, MAX_PICKUP_DAYS_AHEAD, calcPickupDiscount, PICKUP_DISCOUNT_LABEL, type PickupSlot } from "@/lib/pickupWindows";
import { StoreHoursList, ItemThumb } from "@/components/shared/orderDisplay";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PayPalPaymentForm } from "./PayPalPaymentForm";
import { FulfillmentSelector } from "./FulfillmentSelector";
import { StoreClosingBanner } from "./StoreClosingBanner";
import { PaymentMethodCard, CardOutlineIcon, PayPalPIcon, CARD_BRAND_LOGOS, PAYPAL_BRAND_LOGOS } from "./PaymentMethodCard";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const QUICK_CODES = ["WELCOME10", "SUMMER15", "CSL5"];
const TAX = 0.0825;

interface AddrForm { street: string; city: string; state: string; zip: string }
const BLANK_ADDR: AddrForm = { street: "", city: "Leander", state: "TX", zip: "" };

const CHECKOUT_STEPS = ["Your Details", "Payment", "Review Order", "Confirm"];

export const STORE_INFO = {
  name: "Cold Spring Liquor",
  street: "15609 Ronald Reagan Blvd Suite B-100",
  city: "Leander",
  state: "TX",
  zip: "78641",
  hours: "Mon–Sat 10 AM – 9 PM",
};


function CheckoutSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center gap-0 mb-1">
      {CHECKOUT_STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${done ? "bg-green-500 text-white" : active ? "bg-brand-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                {done ? "✓" : step}
              </div>
              <span className={`text-[10px] font-semibold mt-1 text-center leading-tight ${active ? "text-brand-600" : done ? "text-green-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < CHECKOUT_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded ${done ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, error, type = "text", readOnly }: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; error?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all ${readOnly ? "bg-gray-50 text-gray-400 cursor-default" : "bg-white"}`}
      />
      {error && <p className="text-red-500 text-xs mt-1" data-error="1">{error}</p>}
    </div>
  );
}

// Load Google Maps Places script once
let gmScriptPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (gmScriptPromise) return gmScriptPromise;
  gmScriptPromise = new Promise(resolve => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return gmScriptPromise;
}

function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onPlaceSelect: (addr: AddrForm) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadGoogleMaps().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return;
    const g = (window as any).google;
    if (!g?.maps?.places) return;

    acRef.current = new g.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components"],
      // Bias toward Leander / Cedar Park / Liberty Hill TX area
      bounds: new g.maps.LatLngBounds(
        { lat: 30.35, lng: -98.10 },
        { lat: 30.80, lng: -97.50 }
      ),
    });

    acRef.current.addListener("place_changed", () => {
      const place = acRef.current.getPlace();
      if (!place?.address_components) return;

      let streetNumber = "", route = "", city = "", state = "", zip = "";
      for (const c of place.address_components) {
        const t = c.types[0];
        if (t === "street_number") streetNumber = c.long_name;
        else if (t === "route") route = c.long_name;
        else if (t === "locality") city = c.long_name;
        else if (t === "sublocality_level_1" && !city) city = c.long_name;
        else if (t === "administrative_area_level_1") state = c.short_name;
        else if (t === "postal_code") zip = c.long_name;
      }
      onPlaceSelect({
        street: [streetNumber, route].filter(Boolean).join(" "),
        city,
        state,
        zip,
      });
    });
  }, [ready, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? "123 Main St, Apt 4B"}
      autoComplete="off"
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
    />
  );
}

function AddressFields({ addr, onChange, prefix }: { addr: AddrForm; onChange: (a: AddrForm) => void; prefix: string }) {
  const set = (k: keyof AddrForm, v: string) => onChange({ ...addr, [k]: v });
  const handlePlace = useCallback((selected: AddrForm) => onChange(selected), [onChange]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Street Address</label>
        <AddressAutocomplete
          value={addr.street}
          onChange={v => set("street", v)}
          onPlaceSelect={handlePlace}
          placeholder="123 Main St, Apt 4B"
        />
      </div>
      <Field label="City" value={addr.city} onChange={v => set("city", v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="State" value={addr.state} onChange={v => set("state", v)} />
        <Field label="ZIP" value={addr.zip} onChange={v => set("zip", v)} placeholder="78641" />
      </div>
    </div>
  );
}

// ─── Thank You Popup ──────────────────────────────────────────────────────────
function ThankYouPopup({
  orderNumber,
  total,
  customerName,
  onTrack,
  pickup,
  items = [],
}: {
  orderNumber: string;
  total: number;
  customerName: string;
  onTrack: () => void;
  pickup?: { dateLabel: string; label: string } | null;
  items?: { name: string; quantity: number; imageUrl?: string | null; category?: string | null }[];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const firstName = customerName.split(" ")[0] || customerName;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      {/* Card */}
      <div className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${
        visible ? "translate-y-0 scale-100" : "translate-y-8 scale-95"
      }`}>

        {/* Orange header */}
        <div className="px-8 pt-8 pb-7 text-center bg-brand-500">
          <div className="flex justify-center gap-3 mb-4">
            {["🎉", "🥃", "✨"].map((e, i) => (
              <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>{e}</span>
            ))}
          </div>
          <h2 className="text-[1.75rem] font-black text-white tracking-tight leading-tight">
            Thank You, {firstName}!
          </h2>
          <p className="text-white/80 text-sm mt-1.5">{pickup ? "Your pick up order is confirmed" : "Your order has been received"}</p>

          {/* Order badge */}
          <div className="mt-5 inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-5 py-2">
            <span className="text-xs text-white/70 font-mono tracking-wider">#{orderNumber}</span>
            <span className="text-white/40">·</span>
            <span className="text-sm font-black text-white">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* White body */}
        <div className="px-8 py-7 space-y-5">
          {/* Ordered items preview */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {items.slice(0, 6).map((it, i) => (
                <div key={i} className="relative shrink-0">
                  <ItemThumb imageUrl={it.imageUrl} category={it.category} name={it.name} size={48} />
                  {it.quantity > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {it.quantity}
                    </span>
                  )}
                </div>
              ))}
              {items.length > 6 && (
                <span className="text-xs text-gray-400 font-semibold shrink-0">+{items.length - 6} more</span>
              )}
            </div>
          )}
          {pickup ? (
            <>
              {/* Pickup details */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm text-gray-700 space-y-1.5">
                <p>🕐 <strong className="text-gray-900">Pick up:</strong> {pickup.dateLabel} · {pickup.label}</p>
                <p>📍 <strong className="text-gray-900">{STORE_INFO.name}</strong></p>
                <p className="text-gray-500 text-xs pl-5">{STORE_INFO.street}, {STORE_INFO.city}, {STORE_INFO.state} {STORE_INFO.zip}</p>
                <div className="border-t border-gray-200 pt-2 mt-2"><StoreHoursList compact /></div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-800 leading-relaxed">
                🪪 <strong>Bring a valid photo ID</strong> — the person picking up must be 21+, and the name on the ID should match the order.
              </div>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                <div className="relative flex-shrink-0 w-2.5 h-2.5">
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
                  <div className="relative w-full h-full rounded-full bg-green-500" />
                </div>
                <p className="text-sm text-gray-700 font-medium">We&apos;re preparing your order — you&apos;ll get an email when it&apos;s ready</p>
              </div>
            </>
          ) : (
            <>
              {/* Message */}
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                Sit back, relax and enjoy your day —<br />
                <strong className="text-gray-900">we'll take care of everything from here.</strong>
              </p>

              {/* 2 perks */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-2 border border-green-100 bg-green-50 rounded-2xl py-4 px-3">
                  <Truck size={18} className="text-green-600" />
                  <span className="text-xs font-bold text-green-700 text-center leading-tight">FREE Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-2 border border-blue-100 bg-blue-50 rounded-2xl py-4 px-3">
                  <Star size={18} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 text-center leading-tight">No Tip Required</span>
                </div>
              </div>

              {/* Preparing indicator */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                <div className="relative flex-shrink-0 w-2.5 h-2.5">
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
                  <div className="relative w-full h-full rounded-full bg-green-500" />
                </div>
                <p className="text-sm text-gray-700 font-medium">Your order is being confirmed — we'll get started right away</p>
              </div>
            </>
          )}

          {/* CTA */}
          <button
            onClick={onTrack}
            className="w-full flex items-center justify-center gap-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg shadow-orange-500/25"
          >
            <MapPin size={18} />
            {pickup ? "View My Order" : "Track My Order"}
          </button>
          {pickup && <p className="text-center text-[11px] text-gray-400 -mt-2">We will hold your order for 7 days post pickup date</p>}
        </div>
      </div>
    </div>
  );
}

export function CheckoutForm({ mode: initialMode = "delivery" }: { mode?: "delivery" | "pickup" } = {}) {
  // Delivery ↔ Pick Up is switched client-side (no page reload) — shared via
  // checkoutStore so the page header and sidebar summary update together.
  const storeMode = useCheckoutStore(s => s.fulfillmentMode);
  const setFulfillmentMode = useCheckoutStore(s => s.setFulfillmentMode);
  const mode = storeMode ?? initialMode;
  const isPickup = mode === "pickup";
  // Direction of the content slide animation when switching
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const prevModeRef = useRef(mode);

  // Align the shared mode with the URL's page on fresh mount
  useEffect(() => {
    setFulfillmentMode(initialMode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any mode change (tabs, header link) → slide direction + URL sync, no reload
  useEffect(() => {
    if (prevModeRef.current === mode) return;
    setSlideDir(mode === "pickup" ? "right" : "left");
    prevModeRef.current = mode;
    try { window.history.replaceState(null, "", mode === "pickup" ? "/checkout/pickup" : "/checkout"); } catch {}
  }, [mode]);

  const switchMode = setFulfillmentMode;

  // Admin kill-switch: Delivery may be turned off (no driver available).
  // Poll every 10s so flipping the toggle reaches open checkout sessions fast.
  const { data: deliveryStatus } = useQuery({
    queryKey: ["delivery-status"],
    queryFn: async () => {
      const r = await fetch("/api/delivery/status");
      if (!r.ok) throw new Error("status failed");
      return r.json() as Promise<{
        deliveryEnabled: boolean; radiusMiles: number; timeMin: number; timeMax: number;
        minOrder: number; freeDelivery: boolean; noTipRequired: boolean;
      }>;
    },
    refetchInterval: 10_000,
  });
  const deliveryDisabled = deliveryStatus?.deliveryEnabled === false;
  const minOrder = deliveryStatus?.minOrder ?? MIN_ORDER;
  const showFree = deliveryStatus?.freeDelivery !== false;
  const showNoTip = deliveryStatus?.noTipRequired !== false;
  // Customer on the Delivery form when it goes offline → move them to Pick Up
  useEffect(() => {
    if (deliveryDisabled && mode === "delivery") setFulfillmentMode("pickup");
  }, [deliveryDisabled, mode, setFulfillmentMode]);
  const { items, clearCart, removeItem, rewardsPointsToRedeem, setRewardsRedeem, giftCardCode, giftCardAmount, setGiftCard } = useCartStore();
  const pickupOnlyConflictItems = items.filter(i => i.product.pickupOnly && !isPickup);
  const { user, isLoggedIn } = useAuthStore();
  const router = useRouter();

  // Redirect to home only if user was logged in and then logs out mid-checkout
  const wasLoggedIn = useRef(isLoggedIn);
  useEffect(() => {
    if (wasLoggedIn.current && !isLoggedIn) router.push("/");
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, router]);

  // Contact info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Optional note for the store — shown to admin + driver, never required
  const [customerNotes, setCustomerNotes] = useState("");

  // Delivery address
  const [delivery, setDelivery] = useState<AddrForm>(BLANK_ADDR);

  // Pick Up In Store — date + time window (dropdowns)
  const [pickupDay, setPickupDay] = useState(0); // days ahead: 0=today … 7
  const [pickupSlot, setPickupSlot] = useState<PickupSlot | null>(null);
  // Days that are open AND have at least one valid window
  const pickupDays = useMemo(() => {
    if (!isPickup) return [] as { d: number; label: string }[];
    const days: { d: number; label: string }[] = [];
    for (let d = 0; d <= MAX_PICKUP_DAYS_AHEAD; d++) {
      if (isPickupDayOpen(d) && getPickupWindows(d).length > 0) {
        days.push({ d, label: pickupDateLabel(d) });
      }
    }
    return days;
  }, [isPickup]);
  // Default to the first available day
  useEffect(() => {
    if (isPickup && pickupDays.length > 0 && !pickupDays.some(x => x.d === pickupDay)) {
      setPickupDay(pickupDays[0].d);
    }
  }, [isPickup, pickupDays, pickupDay]);
  const pickupSlots = useMemo(() => (isPickup ? getPickupWindows(pickupDay) : []), [isPickup, pickupDay]);
  // Auto-select the first window of the chosen day
  useEffect(() => {
    if (isPickup && pickupSlots.length > 0 && !pickupSlots.some(sl => sl.start === pickupSlot?.start)) {
      setPickupSlot(pickupSlots[0]);
    }
  }, [isPickup, pickupSlots, pickupSlot]);



  // Reorder prefill banner
  const [reorderFromOrder, setReorderFromOrder] = useState<string | null>(null);

  // Promo
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMsg, setPromoMsg] = useState("");
  const [promoError, setPromoError] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const { setPromo, clearPromo } = useCheckoutStore();

  // Gift card
  const [giftInput, setGiftInput] = useState(giftCardCode ?? "");
  const [giftError, setGiftError] = useState("");
  const [applyingGift, setApplyingGift] = useState(false);

  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderPayload, setOrderPayload] = useState<object | null>(null);
  const [paymentStep, setPaymentStep] = useState<null | "select" | "paypal" | "review-free">(null);
  const [selectedMethod, setSelectedMethod] = useState<null | "stripe" | "paypal">(null);
  const [thankYouOrder, setThankYouOrder] = useState<{ orderId: string; orderNumber: string; total: number; pickupWindow?: PickupSlot | null; items?: { name: string; quantity: number; imageUrl?: string | null; category?: string | null }[] } | null>(null);
  const [rewardsDismissed, setRewardsDismissed] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  // Scroll to top on mount and whenever switching to the payment step
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  useEffect(() => { if (clientSecret || paymentStep) window.scrollTo({ top: 0, behavior: "smooth" }); }, [clientSecret, paymentStep]);

  // Handle return from Klarna / 3DS redirect
  useEffect(() => {
    const url = new URL(window.location.href);
    const returnedSecret = url.searchParams.get("payment_intent_client_secret");
    const redirectStatus = url.searchParams.get("redirect_status");
    if (!returnedSecret) return;
    // Clean URL immediately
    ["payment_intent", "payment_intent_client_secret", "redirect_status"].forEach(p => url.searchParams.delete(p));
    window.history.replaceState({}, "", url.toString());
    if (redirectStatus !== "succeeded") return;
    const pendingRaw = sessionStorage.getItem("csl-pending-stripe-order");
    if (!pendingRaw) return;
    sessionStorage.removeItem("csl-pending-stripe-order");
    const { orderPayload: pendingPayload } = JSON.parse(pendingRaw) as { orderPayload: object };
    stripePromise.then(async (stripe) => {
      if (!stripe) return;
      const { paymentIntent } = await stripe.retrievePaymentIntent(returnedSecret);
      if (paymentIntent?.status === "succeeded") {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...pendingPayload, stripePaymentIntentId: paymentIntent.id }),
        });
        if (res.ok) {
          const order = await res.json();
          clearCart();
          setThankYouOrder({ orderId: order.id, orderNumber: order.orderNumber, total: order.total, pickupWindow: order.pickupWindow ?? null, items: (order as any).items ?? [] });
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Read reorder prefill from localStorage (runs once on mount) ───────────
  const [reorderPrefill, setReorderPrefill] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem("csl-reorder-prefill");
    if (!raw) return;
    try {
      const prefill = JSON.parse(raw);
      localStorage.removeItem("csl-reorder-prefill");
      setReorderPrefill(prefill);
      if (prefill.fromOrderNumber) setReorderFromOrder(prefill.fromOrderNumber);
    } catch { /* ignore */ }
  }, []);

  // ── Auto-fill from reorder prefill (priority) or saved user profile ───────
  useEffect(() => {
    const rp = reorderPrefill;
    const u = user;
    const finalName = rp?.customerName ?? u?.name ?? "";
    const finalEmail = rp?.customerEmail ?? u?.email ?? "";
    const finalPhone = rp?.customerPhone ?? u?.phone ?? "";
    const finalDelivery = rp?.deliveryAddress ?? u?.deliveryAddress;
    if (finalName) setName(finalName);
    if (finalEmail) setEmail(finalEmail);
    if (finalPhone) setPhone(formatPhoneUS(finalPhone));
    if (finalDelivery?.street) setDelivery(finalDelivery);
  }, [user, reorderPrefill]);

  // Clear stale rewards redemption if user no longer has enough points
  useEffect(() => {
    if (rewardsPointsToRedeem > 0 && (user?.points ?? 0) < rewardsPointsToRedeem) {
      setRewardsRedeem(0);
    }
  }, [user?.points, rewardsPointsToRedeem, setRewardsRedeem]);

  // Delivery timing — recomputes when admin changes the time range
  const timing = useMemo(
    () => getDeliveryTiming(new Date(), { timeMin: deliveryStatus?.timeMin, timeMax: deliveryStatus?.timeMax }),
    [deliveryStatus?.timeMin, deliveryStatus?.timeMax],
  );

  // Bundle tiers — fetched once from store (admin-configurable)
  const [bundleTiers, setBundleTiers] = useState<{ id: string; minQty: number; discountPct: number; sortOrder: number }[]>([]);
  useEffect(() => {
    fetch("/api/deals/bundle-tiers").then(r => r.json()).then(setBundleTiers).catch(() => {});
  }, []);

  // Totals — delivery always FREE, minimum order $20
  const { subtotal, flashSavings, bundlePct, bundleDiscount, promoBaseSubtotal } = useMemo(() => calcDiscounts(
    items.map(i => ({ price: i.product.price, salePrice: i.product.salePrice, bundleEligible: i.product.bundleEligible, couponExcluded: i.product.couponExcluded, quantity: i.quantity })),
    bundleTiers,
  ), [items, bundleTiers]);
  const totalQty = items.reduce((a, i) => a + i.quantity, 0);
  const rewardsDiscount = calcPointsValue(rewardsPointsToRedeem);
  // Pick Up In Store: automatic discount, tax on the discounted subtotal
  const pickupDiscount = isPickup ? calcPickupDiscount(subtotal) : 0;
  // Rounded to cents at each step — matches processOrder.ts server-side math exactly.
  // Without this, a rounded gift-card amount (capped to cents when applied) can leave
  // a sub-cent float residue in an unrounded total (e.g. $0.0025) that displays as
  // "$0.00" but isn't exactly zero, so checkout skips the free-order path and instead
  // tries to create a Stripe charge below its $0.50 minimum — which always fails.
  const tax = Math.round((subtotal - pickupDiscount) * TAX * 100) / 100;
  // Re-cap gift card to what the order actually owes (guards against over-application when rewards added after gift card)
  const preGiftOwed = Math.max(0, subtotal - bundleDiscount - promoDiscount - rewardsDiscount - pickupDiscount + tax);
  const effectiveGiftCard = Math.min(giftCardAmount, preGiftOwed);
  const total = Math.round(Math.max(0, preGiftOwed - effectiveGiftCard) * 100) / 100;
  // Card processors (Stripe) reject charges under $0.50 — any leftover below that after
  // rewards/gift card is uncollectable, so treat it the same as a full $0 order rather
  // than sending the customer into a payment flow that will always fail.
  const STRIPE_MIN_CHARGE = 0.5;
  const uncollectableRemainder = total > 0 && total < STRIPE_MIN_CHARGE;
  const pointsEarned = Math.floor(total); // 1 pt per $1
  const userPoints = user?.points ?? 0;
  const bestEligibleTier = [1000, 500, 250].find(t => userPoints >= t) ?? 0;
  const meetsMinimum = subtotal >= minOrder;
  const amountToMin = Math.max(0, minOrder - subtotal);

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setApplyingPromo(true); setPromoError(""); setPromoMsg("");
    try {
      const res = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, subtotal: promoBaseSubtotal }) });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error ?? "Invalid code"); setPromoDiscount(0); setPromoCode(null); clearPromo(); }
      else {
        const hasExcluded = items.some(i => i.product.salePrice != null && i.product.salePrice < i.product.price) || items.some(i => i.product.bundleEligible);
        const suffix = hasExcluded ? " (applies to regular-priced items only)" : "";
        setPromoCode(code); setPromoDiscount(data.discount); setPromoMsg(data.message + suffix); setPromo(code, data.discount);
      }
    } catch { setPromoError("Could not validate. Try: WELCOME10"); }
    finally { setApplyingPromo(false); }
  }

  async function applyGiftCard() {
    const code = giftInput.trim().toUpperCase();
    if (!code) return;
    setApplyingGift(true); setGiftError("");
    try {
      const res = await fetch("/api/gift-cards/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) { setGiftError("Invalid or already used gift card code"); setGiftCard(null, 0); }
      else {
        // Cap to the pre-gift-card order total so we don't over-apply
        const preGiftTotal = Math.max(0, subtotal - bundleDiscount - promoDiscount - rewardsDiscount + tax);
        const appliedAmount = Math.min(data.balance, preGiftTotal);
        setGiftCard(code, Math.round(appliedAmount * 100) / 100);
      }
    } catch { setGiftError("Could not validate gift card. Please try again."); }
    finally { setApplyingGift(false); }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name required";
    if (!email.includes("@")) e.email = "Valid email required";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "Phone number required";
    if (isPickup) {
      if (!pickupSlot) e.pickupSlot = "Please select a pickup time window";
    } else {
      if (!delivery.street.trim()) e.street = "Street address required";
      else if (!/^\d+\s/.test(delivery.street.trim())) e.street = "Please include your house/building number (e.g. 1221 Sonny Dr)";
      if (!delivery.city.trim()) e.city = "City required";
      if (!/^\d{5}$/.test(delivery.zip)) e.zip = "Valid ZIP code required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Built from current cart + form state. Rebuilt live for the Stripe screen so
  // quantity edits made on the review step are reflected in the final order.
  function buildOrderPayload() {
    return {
      items: items.map(i => ({
        productId: i.product.id, name: i.product.name, price: i.product.salePrice ?? i.product.price, quantity: i.quantity,
        referenceImageUrl: i.referenceImageUrl, verificationNote: i.verificationNote,
      })),
      ...(isPickup
        ? { orderType: "pickup", pickupWindow: pickupSlot, deliveryAddress: null, billingAddress: null, billingAddressSameAsDelivery: false }
        : { orderType: "delivery", deliveryAddress: delivery, billingAddress: delivery, billingAddressSameAsDelivery: true }),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      customerNotes: customerNotes.trim() || undefined,
      couponCode: promoCode,
      couponDiscount: promoDiscount,
      rewardsDiscount,
      rewardsPointsToRedeem,
      giftCardCode,
      giftCardAmount: effectiveGiftCard,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first visible error so user doesn't miss it
      requestAnimationFrame(() => {
        const el = document.querySelector("[data-error]") as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      });
      return;
    }
    setSubmitting(true);
    setZoneError(null);

    // Validate delivery zone BEFORE creating Stripe PaymentIntent (delivery only)
    if (!isPickup) {
      try {
        const zoneRes = await fetch("/api/orders/validate-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delivery),
        });
        const zoneData = await zoneRes.json();
        if (!zoneData.inRange) {
          setZoneError(zoneData.error ?? "Address is outside our delivery area.");
          setSubmitting(false);
          return;
        }
      } catch {
        setZoneError("Could not verify delivery address. Please check your address and try again.");
        setSubmitting(false);
        return;
      }
    }

    setOrderPayload(buildOrderPayload());
    // Gift card (+ rewards) covers full amount → show review before finalizing
    // Anything under Stripe's $0.50 minimum can't be charged to a card, so route it
    // through the same no-payment confirmation screen as a fully-covered $0 order.
    setPaymentStep(total === 0 || uncollectableRemainder ? "review-free" : "select");
    setSubmitting(false);
  }

  async function selectStripe() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPaymentStep(null);
      setClientSecret(data.clientSecret);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (thankYouOrder) {
    return (
      <ThankYouPopup
        orderNumber={thankYouOrder.orderNumber}
        total={thankYouOrder.total}
        customerName={name}
        pickup={thankYouOrder.pickupWindow ?? (isPickup ? pickupSlot : null)}
        items={thankYouOrder.items ?? []}
        onTrack={() => router.push(`/track/${thankYouOrder.orderId}`)}
      />
    );
  }

  // ── Review screen for $0 orders (gift card covers full amount) ─────────────
  if (paymentStep === "review-free") {
    const rd = {
      customerName: name, customerEmail: email, customerPhone: phone, customerNotes,
      deliveryAddress: delivery,
      items, subtotal, flashSavings, bundleDiscount, bundlePct,
      promoCode, promoDiscount, rewardsDiscount, rewardsPointsToRedeem,
      giftCardAmount: effectiveGiftCard, tax,
    };

    async function confirmFreeOrder() {
      setConfirming(true);
      setConfirmError("");
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // customerNotes spread fresh — orderPayload was snapshotted before this
          // review screen mounted, so an edit made here wouldn't otherwise stick.
          body: JSON.stringify({ ...orderPayload, customerNotes, paymentMethod: "gift_card" }),
        });
        const order = await res.json();
        if (!res.ok) throw new Error(order.error ?? "Failed to place order");
        clearCart();
        setThankYouOrder({ orderId: order.id, orderNumber: order.orderNumber, total: order.total, pickupWindow: order.pickupWindow ?? null, items: (order as any).items ?? [] });
      } catch (err: any) {
        setConfirmError(err.message ?? "Something went wrong. Please try again.");
        setConfirming(false);
      }
    }

    return (
      <div className="space-y-4">
        <CheckoutSteps current={4} />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Review Your Order</h2>
              <p className="text-xs text-gray-400">
                {total > 0 ? "Remaining balance too small to charge — confirm to complete" : "Paid in full by gift card — confirm to complete"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">🛒 Items</h3>
          <div className="space-y-2.5">
            {rd.items.map(({ product: p, quantity }) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <ItemThumb imageUrl={(p as any).imageUrl} category={(p as any).category} name={p.name} size={40} />
                <span className="text-gray-700 flex-1 pr-2 leading-snug">{p.name} <span className="text-gray-400">×{quantity}</span></span>
                <span className="font-medium text-gray-900 shrink-0">{formatCurrency((p.salePrice ?? p.price) * quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-1">📝 Note <span className="font-normal normal-case text-gray-400">(Optional)</span></h3>
          <p className="text-xs text-gray-400 mb-2">Add a note for the store</p>
          <textarea
            value={customerNotes}
            onChange={e => setCustomerNotes(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={3}
            placeholder={"e.g. Please leave at the front door.\ne.g. Don't ring the bell."}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none"
          />
          <p className={`text-xs text-right mt-1.5 ${customerNotes.length >= 180 ? "text-brand-600 font-semibold" : "text-gray-400"}`}>
            {customerNotes.length}/200
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div>
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-1">👤 Contact</h3>
            <p className="text-sm font-semibold text-gray-800">{rd.customerName}</p>
            <p className="text-sm text-gray-500">{rd.customerEmail} · {rd.customerPhone}</p>
          </div>
          <div className="border-t border-gray-100 pt-3">
            {isPickup ? (
              <>
                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-1">🏬 Pick Up In Store</h3>
                <p className="text-sm text-gray-800 font-medium">{pickupSlot ? `${pickupSlot.dateLabel} · ${pickupSlot.label}` : ""}</p>
                <p className="text-sm text-gray-500">{STORE_INFO.street}, {STORE_INFO.city}, {STORE_INFO.state} {STORE_INFO.zip}</p>
                <StoreHoursList />
              </>
            ) : (
              <>
                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-1">📍 Delivery</h3>
                <p className="text-sm text-gray-800">{rd.deliveryAddress.street}</p>
                <p className="text-sm text-gray-500">{rd.deliveryAddress.city}, {rd.deliveryAddress.state} {rd.deliveryAddress.zip}</p>
              </>
            )}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-1">💳 Payment</h3>
            <p className="text-sm text-gray-800">🎁 Gift Card — {giftCardCode}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">💰 Order Total</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(rd.subtotal)}</span></div>
            {rd.flashSavings > 0 && <div className="flex justify-between text-red-600 font-medium"><span>⚡ Flash Sale</span><span>-{formatCurrency(rd.flashSavings)}</span></div>}
            {rd.bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle ({Math.round(rd.bundlePct * 100)}%)</span><span>-{formatCurrency(rd.bundleDiscount)}</span></div>}
            {rd.promoDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ {rd.promoCode}</span><span>-{formatCurrency(rd.promoDiscount)}</span></div>}
            {rd.rewardsDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>🏆 Rewards ({rd.rewardsPointsToRedeem} pts)</span><span>-{formatCurrency(rd.rewardsDiscount)}</span></div>}
            {rd.giftCardAmount > 0 && <div className="flex justify-between text-emerald-600 font-medium"><span>🎁 Gift Card ({giftCardCode})</span><span>-{formatCurrency(rd.giftCardAmount)}</span></div>}
            {isPickup ? (
              <div className="flex justify-between text-green-600 font-bold"><span>💚 Pick Up Discount (−{PICKUP_DISCOUNT_LABEL})</span><span>-{formatCurrency(pickupDiscount)}</span></div>
            ) : (
              <div className="flex justify-between text-green-600 font-medium"><span>🚚 Delivery</span><span>FREE</span></div>
            )}
            <div className="flex justify-between text-gray-500"><span>Tax (8.25%)</span><span>{formatCurrency(rd.tax)}</span></div>
          </div>
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-black text-2xl text-gray-900">{formatCurrency(total)}</span>
          </div>
          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-center">
            <p className="text-xs text-emerald-700 font-semibold">
              {total > 0 ? "🎁 Remaining balance is below our card minimum — no charge needed!" : "🎁 Fully covered by your gift card!"}
            </p>
          </div>
        </div>

        {confirmError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" /> {confirmError}
          </div>
        )}

        <button onClick={confirmFreeOrder} disabled={confirming}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg shadow-brand-500/25">
          {confirming ? <><Loader2 size={18} className="animate-spin" /> Placing Order…</> : <>Confirm Order →</>}
        </button>

        <button type="button" onClick={() => setPaymentStep(null)} disabled={confirming}
          className="w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-40">
          ← Edit Order
        </button>
        <p className="text-center text-xs text-gray-400">🔒 Must be 21+, valid ID checked at delivery.</p>
      </div>
    );
  }

  // ── Payment method selection ────────────────────────────────────────────────
  if (paymentStep === "select") {
    return (
      <div className="space-y-3">
        {/* Step progress */}
        <CheckoutSteps current={2} />

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-base text-gray-800">Choose Payment</h2>
            <span className="font-black text-2xl text-gray-900">{formatCurrency(total)}</span>
          </div>
          <p className="text-xs text-gray-400 mb-5">Select how you&apos;d like to pay — you&apos;ll review your order before confirming</p>
          <div role="radiogroup" aria-label="Payment method" className="space-y-3">
            <PaymentMethodCard
              variant="gold"
              selected={selectedMethod === "stripe"}
              disabled={submitting}
              onSelect={() => { setSelectedMethod("stripe"); selectStripe(); }}
              title="Card · Apple Pay · Klarna"
              subtitle="Credit & debit cards, Apple Pay, Google Pay, or pay later with Klarna."
              icon={<CardOutlineIcon />}
              logos={CARD_BRAND_LOGOS}
            />
            <PaymentMethodCard
              variant="blue"
              selected={selectedMethod === "paypal"}
              onSelect={() => { setSelectedMethod("paypal"); setPaymentStep("paypal"); }}
              title="PayPal · Venmo"
              subtitle="Pay with your PayPal balance, bank account, or Venmo."
              icon={<PayPalPIcon />}
              logos={PAYPAL_BRAND_LOGOS}
            />
          </div>
        </div>
        <button type="button" onClick={() => { setPaymentStep(null); setOrderPayload(null); setSelectedMethod(null); }}
          className="w-full border border-gray-200 text-gray-600 text-sm font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
          ← Back to your details
        </button>
        <p className="text-center text-xs text-gray-400">🔒 All payments are encrypted and secure. Must be 21+.</p>
      </div>
    );
  }

  // ── PayPal / Venmo ───────────────────────────────────────────────────────────
  if (paymentStep === "paypal") {
    return (
      <PayPalPaymentForm
        total={total}
        orderPayload={orderPayload!}
        onCustomerNotesChange={setCustomerNotes}
        reviewData={{
          customerName: name, customerEmail: email, customerPhone: phone, customerNotes,
          deliveryAddress: delivery,
          billingAddress: delivery,
          sameBilling: true,
          items, subtotal, flashSavings, bundleDiscount, bundlePct,
          promoCode, promoDiscount, rewardsDiscount, rewardsPointsToRedeem,
          giftCardAmount: effectiveGiftCard, tax,
          pickup: isPickup && pickupSlot ? { dateLabel: pickupSlot.dateLabel, label: pickupSlot.label } : null,
          pickupDiscount,
        }}
        onSuccess={(order) => {
          clearCart();
          setThankYouOrder({ orderId: order.id, orderNumber: order.orderNumber, total: order.total, pickupWindow: order.pickupWindow ?? null, items: (order as any).items ?? [] });
        }}
        onCancel={() => setPaymentStep("select")}
      />
    );
  }

  if (clientSecret) {
    return (
      <Elements stripe={stripePromise} options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#f97316",
            colorBackground: "#ffffff",
            colorText: "#111827",
            colorDanger: "#ef4444",
            fontFamily: "Inter, system-ui, sans-serif",
            borderRadius: "12px",
            spacingUnit: "4px",
          },
          rules: {
            ".Input": { border: "1px solid #e5e7eb", boxShadow: "none", padding: "12px 16px" },
            ".Input:focus": { border: "1px solid #f97316", boxShadow: "0 0 0 3px rgba(249,115,22,0.15)" },
            ".Tab": { border: "2px solid #e5e7eb", borderRadius: "12px", padding: "12px 16px" },
            ".Tab--selected": { border: "2px solid #f97316", backgroundColor: "#fff7ed" },
            ".Tab:hover": { border: "2px solid #d1d5db" },
            ".Label": { fontWeight: "500", fontSize: "14px" },
          },
        },
      }}>
        <StripePaymentForm
          clientSecret={clientSecret}
          orderPayload={buildOrderPayload()}
          total={total}
          minOrder={minOrder}
          onCustomerNotesChange={setCustomerNotes}
          reviewData={{
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            deliveryAddress: delivery,
            billingAddress: delivery,
            sameBilling: true,
            items,
            subtotal,
            flashSavings,
            bundleDiscount,
            bundlePct,
            promoCode,
            promoDiscount,
            rewardsDiscount,
            rewardsPointsToRedeem,
            giftCardAmount: effectiveGiftCard,
            tax,
            pickup: isPickup && pickupSlot ? { dateLabel: pickupSlot.dateLabel, label: pickupSlot.label } : null,
            pickupDiscount,
          }}
          onSuccess={(order) => {
            clearCart();
            setThankYouOrder({
              orderId: order.id,
              orderNumber: order.orderNumber,
              total: order.total,
              pickupWindow: order.pickupWindow ?? null,
              items: (order as any).items ?? [],
            });
          }}
          onCancel={() => { setClientSecret(null); setPaymentStep("select"); setSubmitting(false); }}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <CheckoutSteps current={1} />

      {/* Delivery / Pick Up selector — always visible, sticky tabs on mobile */}
      <FulfillmentSelector mode={mode} onChange={switchMode} deliveryDisabled={deliveryDisabled} freeDelivery={showFree} noTipRequired={showNoTip} />

      {deliveryDisabled && (
        <div className="flex items-start gap-2.5 bg-amber-50 border-[1.5px] border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>We are sorry! Delivery is temporarily unavailable.</strong><br />
            Thank you for your understanding. Please choose <strong>Pick Up In Store</strong> for today — we&apos;ll be happy to deliver your next order! 🧡
          </span>
        </div>
      )}

      <div key={mode} className={`space-y-3 ${slideDir === "right" ? "csl-slide-in-right" : slideDir === "left" ? "csl-slide-in-left" : ""}`}>

      {/* Mobile order summary accordion */}
      <div className="lg:hidden bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
        <button type="button" onClick={() => setShowMobileSummary(s => !s)}
          className="w-full flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-bold text-sm">Order Summary</span>
            <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{totalQty} items</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-bold">{formatCurrency(total)}</span>
            {showMobileSummary ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </div>
        </button>
        {showMobileSummary && (
          <div className="px-5 pb-5 border-t border-gray-200">
            <div className="space-y-2 pt-4 mb-3">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-2.5 text-xs">
                  <span className="w-5 h-5 bg-brand-500 rounded-full text-white font-black flex items-center justify-center shrink-0 text-[10px]">{quantity}</span>
                  <span className="flex-1 text-gray-600 truncate">{product.name}</span>
                  <span className="text-gray-900 font-medium">{formatCurrency((product.salePrice ?? product.price) * quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle</span><span>-{formatCurrency(bundleDiscount)}</span></div>}
              {promoDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ Promo</span><span>-{formatCurrency(promoDiscount)}</span></div>}
              {rewardsDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>🏆 Rewards</span><span>-{formatCurrency(rewardsDiscount)}</span></div>}
              {effectiveGiftCard > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🎁 Gift Card</span><span>-{formatCurrency(effectiveGiftCard)}</span></div>}
              {isPickup ? (
                <>
                  <div className="flex justify-between text-brand-600 font-medium"><span>🏬 Pick Up In Store</span><span>{pickupSlot ? pickupSlot.label : "—"}</span></div>
                  <div className="flex justify-between text-green-600 font-bold"><span>💚 Pick Up Discount (−{PICKUP_DISCOUNT_LABEL})</span><span>-{formatCurrency(pickupDiscount)}</span></div>
                </>
              ) : (
                <>
                  {showFree && <div className="flex justify-between text-green-600 font-medium"><span>🚚 Delivery</span><span>FREE</span></div>}
                </>
              )}
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between text-gray-900 font-bold text-sm pt-2 border-t border-gray-200">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notices */}
      {reorderFromOrder && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-blue-800">
          <RefreshCw size={14} className="shrink-0 text-blue-500" />
          <span>Reordering from <strong>#{reorderFromOrder}</strong> — your previous info has been pre-filled.</span>
        </div>
      )}
      {!reorderFromOrder && isLoggedIn && user?.deliveryAddress?.street && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle size={14} className="shrink-0 text-green-600" />
          <span>Your saved info has been auto-filled. <button type="button" onClick={() => { setDelivery(BLANK_ADDR); setName(""); setEmail(""); setPhone(""); }} className="underline font-medium">Clear</button></span>
        </div>
      )}
      {!isLoggedIn && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
          <Link href="/auth/login" className="font-semibold underline">Sign in</Link> to auto-fill your info and earn points on this order.
        </div>
      )}

      {/* 1. Contact Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-black shrink-0">1</div>
          <User size={14} className="text-gray-400" />
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wide">Contact Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <Field label="Full Name" value={name} onChange={setName} placeholder="John Smith" error={errors.name} />
          </div>
          <Field label="Email" value={email} onChange={setEmail} placeholder="john@example.com" type="email" error={errors.email} />
          <Field label="Phone" value={phone} onChange={v => setPhone(formatPhoneUS(v))} placeholder="(512) 555-0100" type="tel" error={errors.phone} />
        </div>
      </div>

      {/* 2. Delivery Address (delivery) / Store Info + Pickup Time (pickup) */}
      {!isPickup ? (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
          <MapPin size={14} className="text-gray-400" />
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wide">Delivery Address</h2>
        </div>
        <AddressFields addr={delivery} onChange={(a) => { setDelivery(a); setZoneError(null); }} prefix="delivery" />
        {errors.street && <p className="text-red-500 text-xs mt-2" data-error="1">{errors.street}</p>}
        {errors.zip && <p className="text-red-500 text-xs mt-2" data-error="1">{errors.zip}</p>}
        {zoneError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-red-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" /><span>{zoneError}</span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Service area: Leander · Cedar Park · Liberty Hill, TX (within 10 miles)</p>
      </div>
      ) : (
      <>
      {/* Store Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-black shrink-0">2</div>
          <MapPin size={14} className="text-gray-400" />
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wide">Pick Up Location</h2>
        </div>
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3.5">
          <span className="text-xl leading-none mt-0.5">🏬</span>
          <div>
            <p className="font-bold text-gray-900 text-sm">{STORE_INFO.name}</p>
            <p className="text-sm text-gray-600">{STORE_INFO.street}</p>
            <p className="text-sm text-gray-600">{STORE_INFO.city}, {STORE_INFO.state} {STORE_INFO.zip}</p>
            <p className="text-xs text-gray-400 mt-1">{STORE_INFO.hours} · Sunday closed</p>
          </div>
        </div>
      </div>

      {/* Pickup Date & Time — dropdowns */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-black shrink-0">3</div>
          <Clock size={14} className="text-gray-400" />
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wide">Pick Up Time Window</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">First available time is 30 minutes from now.</p>

        {pickupDays.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            No pickup windows available right now — please check back tomorrow. (We're closed on Sunday.)
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Date</label>
              <select
                value={pickupDay}
                onChange={e => { setPickupDay(Number(e.target.value)); setPickupSlot(null); }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              >
                {pickupDays.map(({ d, label }) => (
                  <option key={d} value={d}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Time Window</label>
              <select
                value={pickupSlot?.start ?? ""}
                onChange={e => {
                  const slot = pickupSlots.find(sl => sl.start === e.target.value) ?? null;
                  setPickupSlot(slot);
                  setErrors(er => { const { pickupSlot: _drop, ...rest } = er; return rest; });
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              >
                {pickupSlots.map(slot => (
                  <option key={slot.start} value={slot.start}>{slot.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {errors.pickupSlot && <p className="text-red-500 text-xs mt-2" data-error="1">{errors.pickupSlot}</p>}

        {/* Pick Up Instructions */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <p className="font-bold text-xs uppercase tracking-wide mb-1.5 text-amber-800">🪪 Pick Up Instructions</p>
          <ul className="text-xs leading-relaxed text-amber-800 space-y-0.5">
            <li>✓ Bring a valid government-issued photo ID.</li>
            <li>✓ Customer must be <strong>21+</strong> to pick up.</li>
            <li>✓ The name on ID should match the order.</li>
          </ul>
          <p className="text-[11px] text-amber-600 mt-1.5">We will hold your order for 7 days post pickup date.</p>
        </div>
      </div>
      </>
      )}

      {/* 3. Promo & Rewards */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-black shrink-0">3</div>
          <Tag size={14} className="text-gray-400" />
          <h2 className="font-bold text-sm text-gray-800 uppercase tracking-wide">Promo & Rewards</h2>
          <span className="text-xs text-gray-400 ml-1">(optional)</span>
        </div>
        {promoCode ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3">
            <CheckCircle size={16} className="text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-green-700 text-sm">{promoCode} applied!</p>
              <p className="text-xs text-green-600">{promoMsg}</p>
            </div>
            <button type="button" onClick={() => { setPromoCode(null); setPromoDiscount(0); setPromoMsg(""); setPromoInput(""); clearPromo(); }} className="text-xs text-gray-400 hover:text-red-500 underline">Remove</button>
          </div>
        ) : (
          <div className="mb-3">
            <div className="flex gap-2">
              <input value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyPromo())}
                placeholder="WELCOME10"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 uppercase placeholder:normal-case"
              />
              <button type="button" onClick={applyPromo} disabled={applyingPromo || !promoInput.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                {applyingPromo ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
              </button>
            </div>
            {promoError && <p className="text-red-500 text-xs mt-2">{promoError}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_CODES.map(c => (
                <button key={c} type="button" onClick={() => { setPromoInput(c); setPromoError(""); }}
                  className="text-xs text-gray-500 font-mono bg-gray-100 hover:bg-brand-50 hover:text-brand-600 px-3 py-1 rounded-full border border-gray-200 transition-colors">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Gift Card */}
        <div className="mt-3">
          {giftCardAmount > 0 ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <Gift size={15} className="text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-green-700 text-sm">Gift card applied!</p>
                <p className="text-xs text-green-600">{giftCardCode} · saving {formatCurrency(giftCardAmount)}</p>
              </div>
              <button type="button" onClick={() => { setGiftCard(null, 0); setGiftInput(""); }} className="text-xs text-gray-400 hover:text-red-500 underline">Remove</button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Have a gift card?</p>
              <div className="flex gap-2">
                <input
                  value={giftInput}
                  onChange={e => { setGiftInput(e.target.value.toUpperCase()); setGiftError(""); }}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyGiftCard())}
                  placeholder="GIFT-XXXX-XXXX"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 font-mono placeholder:font-sans"
                />
                <button type="button" onClick={applyGiftCard} disabled={applyingGift || !giftInput.trim()}
                  className="bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
                  {applyingGift ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                </button>
              </div>
              {giftError && <p className="text-red-500 text-xs mt-2">{giftError}</p>}
            </div>
          )}
        </div>

        {isLoggedIn && bestEligibleTier > 0 && !rewardsDismissed && (
          rewardsPointsToRedeem > 0 ? (
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <Gift size={15} className="text-purple-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-purple-800 text-sm">{rewardsPointsToRedeem} pts redeemed!</p>
                <p className="text-xs text-purple-600">Saving {formatCurrency(rewardsDiscount)} on this order</p>
              </div>
              <button type="button" onClick={() => setRewardsRedeem(0)} className="text-xs text-gray-400 hover:text-red-500 underline">Remove</button>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gift size={14} className="text-purple-600 shrink-0" />
                <p className="font-bold text-sm text-purple-800">You have rewards available!</p>
                <span className="ml-auto text-xs text-gray-500">{userPoints.toLocaleString()} pts</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Congratulations! You have <strong className="text-purple-700">{formatCurrency(calcPointsValue(bestEligibleTier))}</strong> reward available for this order.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRewardsRedeem(bestEligibleTier)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors">
                  Redeem Now
                </button>
                <button type="button" onClick={() => setRewardsDismissed(true)}
                  className="flex-1 border border-gray-200 bg-white text-gray-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Save for Later
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Order Totals accordion */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button type="button" onClick={() => setShowSummary(s => !s)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <span className="font-bold text-sm text-gray-800">Order Totals</span>
          <div className="flex items-center gap-2">
            <span className="text-brand-600 font-bold">{formatCurrency(total)}</span>
            {showSummary ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </div>
        </button>
        {showSummary && (
          <div className="px-5 pb-5 border-t border-gray-100 space-y-1.5 text-sm">
            <div className="pt-4 space-y-1.5">
              <div className="flex justify-between text-gray-500"><span>Subtotal ({totalQty} items)</span><span>{formatCurrency(subtotal)}</span></div>
              {flashSavings > 0 && <div className="flex justify-between text-red-600 font-medium"><span>⚡ Flash Sale savings</span><span>-{formatCurrency(flashSavings)}</span></div>}
              {bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle ({Math.round(bundlePct * 100)}%)</span><span>-{formatCurrency(bundleDiscount)}</span></div>}
              {promoDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ Promo ({promoCode})</span><span>-{formatCurrency(promoDiscount)}</span></div>}
              {rewardsDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>🏆 Rewards ({rewardsPointsToRedeem} pts)</span><span>-{formatCurrency(rewardsDiscount)}</span></div>}
              {effectiveGiftCard > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🎁 Gift Card</span><span>-{formatCurrency(effectiveGiftCard)}</span></div>}
              {isPickup ? (
                <>
                  <div className="flex justify-between text-brand-600 font-medium"><span>🏬 Pick Up In Store</span><span>{pickupSlot ? pickupSlot.label : "—"}</span></div>
                  <div className="flex justify-between text-green-600 font-bold"><span>💚 Pick Up Discount (−{PICKUP_DISCOUNT_LABEL})</span><span>-{formatCurrency(pickupDiscount)}</span></div>
                </>
              ) : (
                <>
                  {showFree && <div className="flex justify-between text-green-600 font-medium"><span>🚚 Delivery</span><span>FREE</span></div>}
                  {showNoTip && <div className="flex justify-between text-green-600 font-medium"><span>💰 Tip</span><span>NOT Required</span></div>}
                </>
              )}
              <div className="flex justify-between text-gray-500"><span>Tax (8.25%)</span><span>{formatCurrency(tax)}</span></div>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-sm pt-2 border-t border-gray-100">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
            {(flashSavings + bundleDiscount + promoDiscount + rewardsDiscount + effectiveGiftCard + pickupDiscount) > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-green-700 font-semibold">You save {formatCurrency(flashSavings + bundleDiscount + promoDiscount + rewardsDiscount + effectiveGiftCard + pickupDiscount)} on this order!</p>
              </div>
            )}
            <p className="text-xs text-center text-brand-600 font-medium pt-1">🏆 You&apos;ll earn <strong>{pointsEarned} CS Points</strong> on this order</p>
          </div>
        )}
      </div>

      {/* Delivery timing (delivery only). After the 8:30 PM cutoff the
          StoreClosingBanner above the submit button takes over — no small
          amber note here, so the message isn't shown twice. */}
      {!isPickup && timing.type === "same-day" && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <Clock size={15} className="shrink-0 text-green-600" />
          <span>{timing.message}</span>
        </div>
      )}

      {/* Pickup Only conflict — blocks checkout in Delivery mode */}
      {pickupOnlyConflictItems.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
          <p className="font-bold text-blue-800 mb-1">🏬 Pickup Only item{pickupOnlyConflictItems.length > 1 ? "s" : ""} in your cart</p>
          <p className="text-blue-700 text-sm mb-3">
            The following item{pickupOnlyConflictItems.length > 1 ? "s are" : " is"} only available for Pick Up In Store. Remove {pickupOnlyConflictItems.length > 1 ? "them" : "it"} or switch to Pick Up to continue.
          </p>
          <div className="space-y-2">
            {pickupOnlyConflictItems.map(({ product }) => (
              <div key={product.id} className="flex items-center justify-between bg-white rounded-lg border border-blue-200 px-3 py-2">
                <span className="text-sm text-gray-700 truncate">{product.name}</span>
                <button type="button" onClick={() => removeItem(product.id)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 shrink-0 ml-3">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Min order */}
      {!meetsMinimum && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-center">
          <p className="font-bold text-amber-800 mb-1">⚠️ Minimum order not met</p>
          <p className="text-amber-700 text-sm mb-3">
            Add <strong>{formatCurrency(amountToMin)}</strong> more in items · Minimum cart value is ${minOrder} (gift cards &amp; discounts don&apos;t count toward the minimum).
          </p>
          <Link href="/products" className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">+ Add More Items</Link>
        </div>
      )}

      </div>

      {/* After 8:30 PM Central (or Sunday): emphasize next-morning prep for
          delivery orders, directly above the submit button. Pickup is exempt —
          it has an explicit time-window picker. */}
      {!isPickup && <StoreClosingBanner />}

      {!clientSecret && (
        <button type="submit" disabled={submitting || items.length === 0 || !meetsMinimum || pickupOnlyConflictItems.length > 0}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg shadow-brand-500/25">
          {submitting
            ? <><Loader2 size={18} className="animate-spin" /> Processing...</>
            : <><span>Continue to Payment</span><span className="opacity-60 mx-1">·</span><span>{formatCurrency(total)}</span><span className="opacity-60 ml-1">→</span></>}
        </button>
      )}
    </form>
  );
}

interface ReviewData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string;
  deliveryAddress: { street: string; city: string; state: string; zip: string };
  billingAddress: { street: string; city: string; state: string; zip: string };
  sameBilling: boolean;
  items: { product: { id: string; name: string; price: number; salePrice?: number | null; imageUrl?: string | null; category?: string | null }; quantity: number }[];
  subtotal: number;
  flashSavings: number;
  bundleDiscount: number;
  bundlePct: number;
  promoCode: string | null;
  promoDiscount: number;
  rewardsDiscount: number;
  rewardsPointsToRedeem: number;
  giftCardAmount: number;
  tax: number;
  // Pick Up In Store
  pickup?: { dateLabel: string; label: string } | null;
  pickupDiscount?: number;
}

function StripePaymentForm({ clientSecret, orderPayload, total, minOrder, reviewData, onCustomerNotesChange, onSuccess, onCancel }: {
  clientSecret: string;
  orderPayload: object;
  total: number;
  minOrder: number;
  reviewData: ReviewData;
  onCustomerNotesChange: (value: string) => void;
  onSuccess: (order: { id: string; orderNumber: string; total: number; pickupWindow?: PickupSlot | null }) => void;
  onCancel: () => void;
}) {
  const isPickup = !!reviewData.pickup;
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [pmInfo, setPmInfo] = useState<{ id: string; type: string; brand?: string; last4?: string } | null>(null);
  const [diffBilling, setDiffBilling] = useState(false);
  const [billAddr, setBillAddr] = useState({
    street: reviewData.billingAddress.street,
    city: reviewData.billingAddress.city,
    state: reviewData.billingAddress.state,
    zip: reviewData.billingAddress.zip,
  });

  async function handleGoToReview(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    // Skip elements.submit() — it causes false "card incomplete" errors on mobile.
    // stripe.confirmPayment handles full validation when user confirms.
    setReviewing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleConfirmPay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError("");
    try {
      // Quantities can be edited on this review screen — sync the PaymentIntent
      // amount to the live total before confirming the charge
      const sync = await fetch("/api/stripe/payment-intent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientSecret, amount: total }),
      });
      if (!sync.ok) {
        setPayError("Could not update your order total. Please try again.");
        setPaying(false);
        return;
      }
      await elements.fetchUpdates();

      // Stripe requires elements.submit() immediately before confirmPayment, before any async work
      const { error: submitErr } = await elements.submit();
      if (submitErr) {
        setPayError(submitErr.message ?? "Please check your payment details.");
        setPaying(false);
        return;
      }

      // Save payload before any potential redirect (Klarna, 3DS)
      sessionStorage.setItem("csl-pending-stripe-order", JSON.stringify({ orderPayload }));

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: {
            billing_details: {
              name: reviewData.customerName,
              email: reviewData.customerEmail,
              phone: reviewData.customerPhone,
              // Pickup orders may not have a billing address typed in — only send it when present
              ...(billAddr.street || billAddr.zip ? {
                address: {
                  line1: billAddr.street,
                  city: billAddr.city,
                  state: billAddr.state,
                  postal_code: billAddr.zip,
                  country: "US",
                },
              } : {}),
            },
          },
        },
        redirect: "if_required",
      });
      const error = result.error;
      const paymentIntent = "paymentIntent" in result ? result.paymentIntent : undefined;

      if (error) {
        sessionStorage.removeItem("csl-pending-stripe-order");
        setPayError(error.message ?? "Payment failed.");
        setPaying(false);
        // Stay on review screen so error is visible with "Edit Payment" option
        return;
      }
      // Reached here = no redirect → payment confirmed inline (card without 3DS, Apple Pay, etc.)
      if (paymentIntent?.status === "succeeded") {
        sessionStorage.removeItem("csl-pending-stripe-order");
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...orderPayload, stripePaymentIntentId: paymentIntent.id }),
        });
        const order = await res.json();
        if (!res.ok) throw new Error(order.error ?? "Order creation failed");
        // Immediately clear server cart so other devices sync on next focus
        fetch("/api/auth/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart: [] }),
        }).catch(() => {});
        onSuccess(order);
      } else if (paymentIntent) {
        setPayError(`Payment status: ${paymentIntent.status}. Please try again.`);
        setPaying(false);
      }
    } catch (err) {
      sessionStorage.removeItem("csl-pending-stripe-order");
      const msg = err instanceof Error ? err.message : String(err);
      setPayError(msg || "Something went wrong. Please try again.");
      setPaying(false);
      // Keep review screen open so user sees the error in context
    }
  }

  const rd = reviewData;
  const totalSavings = rd.flashSavings + rd.bundleDiscount + rd.promoDiscount + rd.rewardsDiscount + rd.giftCardAmount + (rd.pickupDiscount ?? 0);
  const pointsEarned = Math.floor(total);
  const belowMin = rd.subtotal < minOrder;

  return (
    <>
      {/* ── REVIEW SCREEN — shown on top when reviewing=true ── */}
      {reviewing && (
        <div className="space-y-4">
          <CheckoutSteps current={4} />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Review Your Order</h2>
                <p className="text-xs text-gray-400">Please confirm all details before paying</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">🛒 Items Ordered</h3>
            <div className="space-y-3">
              {rd.items.map(({ product, quantity }) => {
                const price = product.salePrice ?? product.price;
                return (
                  <div key={product.id} className="flex items-center gap-3">
                    <div className="shrink-0">
                      <ItemThumb imageUrl={(product as any).imageUrl} category={(product as any).category} name={product.name} size={44} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{product.name}</p>
                      <div className="mt-1.5 inline-flex items-center gap-1 border border-gray-200 rounded-full bg-gray-50">
                        <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)}
                          disabled={paying || quantity <= 1}
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <Minus size={13} />
                        </button>
                        <span className="min-w-6 text-center text-sm font-bold text-gray-900">{quantity}</span>
                        <button type="button" onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={paying}
                          aria-label={`Increase quantity of ${product.name}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(price * quantity)}</p>
                      {product.salePrice != null && product.salePrice < product.price && (
                        <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price * quantity)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-1">📝 Note <span className="font-normal normal-case text-gray-400">(Optional)</span></h3>
            <p className="text-xs text-gray-400 mb-2">Add a note for the store</p>
            <textarea
              value={rd.customerNotes ?? ""}
              onChange={e => onCustomerNotesChange(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              placeholder={"e.g. Please leave at the front door.\ne.g. Don't ring the bell."}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none"
            />
            <p className={`text-xs text-right mt-1.5 ${(rd.customerNotes?.length ?? 0) >= 180 ? "text-brand-600 font-semibold" : "text-gray-400"}`}>
              {rd.customerNotes?.length ?? 0}/200
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-2">👤 Contact</h3>
              <p className="text-sm text-gray-800 font-medium">{rd.customerName}</p>
              <p className="text-sm text-gray-500">{rd.customerEmail} · {rd.customerPhone}</p>
            </div>
            <div className="border-t border-gray-100 pt-4">
              {isPickup ? (
                <>
                  <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-2">🏬 Pick Up In Store</h3>
                  <p className="text-sm text-gray-800 font-medium">{rd.pickup!.dateLabel} · {rd.pickup!.label}</p>
                  <p className="text-sm text-gray-500">{STORE_INFO.street}, {STORE_INFO.city}, {STORE_INFO.state} {STORE_INFO.zip}</p>
                  <StoreHoursList />
                </>
              ) : (
                <>
                  <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-2">📍 Delivery Address</h3>
                  <p className="text-sm text-gray-800">{rd.deliveryAddress.street}</p>
                  <p className="text-sm text-gray-500">{rd.deliveryAddress.city}, {rd.deliveryAddress.state} {rd.deliveryAddress.zip}</p>
                </>
              )}
            </div>
            {(billAddr.street || billAddr.zip) && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-2">🧾 Billing Address</h3>
              <p className="text-sm text-gray-800">{billAddr.street}</p>
              <p className="text-sm text-gray-500">{billAddr.city}, {billAddr.state} {billAddr.zip}</p>
            </div>
            )}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-2">💳 Payment Method</h3>
              <p className="text-sm text-gray-800 font-medium">🔒 Secure Card / Wallet Payment</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide mb-3">💰 Order Total</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal ({rd.items.reduce((a,i)=>a+i.quantity,0)} items)</span><span>{formatCurrency(rd.subtotal)}</span></div>
              {rd.flashSavings > 0 && <div className="flex justify-between text-red-600 font-medium"><span>⚡ Flash Deal savings</span><span>-{formatCurrency(rd.flashSavings)}</span></div>}
              {rd.bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle ({Math.round(rd.bundlePct * 100)}%)</span><span>-{formatCurrency(rd.bundleDiscount)}</span></div>}
              {rd.promoDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ {rd.promoCode}</span><span>-{formatCurrency(rd.promoDiscount)}</span></div>}
              {rd.rewardsDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>🏆 Rewards ({rd.rewardsPointsToRedeem} pts)</span><span>-{formatCurrency(rd.rewardsDiscount)}</span></div>}
              {rd.giftCardAmount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🎁 Gift Card</span><span>-{formatCurrency(rd.giftCardAmount)}</span></div>}
              {isPickup ? (
                <div className="flex justify-between text-green-600 font-bold"><span>💚 Pick Up Discount (−{PICKUP_DISCOUNT_LABEL})</span><span>-{formatCurrency(rd.pickupDiscount ?? 0)}</span></div>
              ) : (
                <div className="flex justify-between text-green-600 font-medium"><span>🚚 Delivery</span><span>FREE</span></div>
              )}
              <div className="flex justify-between text-gray-500"><span>Tax (8.25%)</span><span>{formatCurrency(rd.tax)}</span></div>
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-baseline">
              <span className="font-bold text-gray-900 text-base">Total</span>
              <span className="font-black text-2xl text-gray-900">{formatCurrency(total)}</span>
            </div>
            {totalSavings > 0 && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                <p className="text-xs text-green-700 font-semibold">You save {formatCurrency(totalSavings)} on this order!</p>
              </div>
            )}
            <p className="text-xs text-center mt-2 text-brand-600 font-medium">🏆 You&apos;ll earn <strong>{pointsEarned} CS Points</strong> on this order</p>
          </div>

          {payError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle size={14} className="shrink-0 text-red-500" /> <span>{payError}</span>
            </div>
          )}

          {belowMin && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800 text-center">
              ⚠️ Minimum cart value is <strong>${minOrder}</strong> — please increase quantities or go back to add more items.
            </div>
          )}
          {!belowMin && total < 0.5 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800 text-center">
              Your discounts now cover the full amount — please go back and restart checkout to complete this order.
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => { setReviewing(false); setPayError(""); }} disabled={paying}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              ← Edit Payment
            </button>
            <button type="button" onClick={handleConfirmPay} disabled={paying || !stripe || belowMin || total < 0.5}
              className="flex-[2] flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 text-base">
              {paying
                ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
                : <>Confirm & Pay {formatCurrency(total)} →</>}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400">🔒 Your payment is encrypted and secure. Must be 21+, valid ID checked at {isPickup ? "pickup" : "delivery"}.</p>
        </div>
      )}

      {/* ── PAYMENT FORM — always mounted (hidden via CSS when reviewing) ──
          Keeping this mounted ensures Stripe retains the card data entered
          by the user so stripe.confirmPayment works from the review screen. */}
      <form onSubmit={handleGoToReview} className={`space-y-4${reviewing ? " hidden" : ""}`}>
        <CheckoutSteps current={3} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-base text-gray-800 flex items-center gap-2">
              <CreditCard size={17} className="text-brand-500 shrink-0" /> Payment
            </h2>
            <span className="font-black text-2xl text-gray-900">{formatCurrency(total)}</span>
          </div>
          <p className="text-xs text-gray-400 mb-5">Pay securely with Card or Klarna (buy now, pay later)</p>
          <PaymentElement options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
            fields: { billingDetails: "never" },
          }} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
            🏠 Billing Address{isPickup ? " (for your card)" : ""}
          </h2>
          {isPickup ? (
            <>
              {/* Pickup has no delivery address — the card's billing address must be typed in */}
              <p className="text-xs text-gray-400 mb-3">Enter the billing address on file with your card.</p>
              <AddressFields addr={billAddr} onChange={setBillAddr} prefix="billing-payment" />
            </>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 mb-3">
                <p className="font-medium">{billAddr.street}</p>
                <p className="text-gray-500">{billAddr.city}, {billAddr.state} {billAddr.zip}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={diffBilling}
                  onChange={e => setDiffBilling(e.target.checked)}
                  className="w-4 h-4 accent-brand-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600">My card uses a different billing address</span>
              </label>
              {diffBilling && (
                <div className="mt-3">
                  <AddressFields addr={billAddr} onChange={setBillAddr} prefix="billing-payment" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { icon: "🔒", label: "SSL Encrypted" },
            { icon: "✅", label: "Powered by Stripe" },
            { icon: "🛡️", label: "Secure Checkout" },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-2">
              <p className="text-lg">{icon}</p>
              <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        {payError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2 text-red-700">
            <AlertTriangle size={14} className="shrink-0 text-red-500" /> <span>{payError}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
            ← Back
          </button>
          <button type="submit" disabled={!stripe}
            className="flex-[2] flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 text-base">
            Review Order →
          </button>
        </div>
        <p className="text-center text-xs text-gray-400">
          🔒 Your payment is encrypted and secure. Must be 21+, valid ID checked at delivery.
        </p>
      </form>
    </>
  );
}
