"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MapPin, CreditCard, Loader2, Tag, CheckCircle, ChevronDown, ChevronUp, User, CreditCard as BillingIcon, Clock, AlertTriangle, RefreshCw, Truck, Star } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useCheckoutStore } from "@/store/checkoutStore";
import { calcDiscounts } from "@/lib/discountRules";
import { useRouter } from "next/navigation";
import { formatCurrency, MIN_ORDER } from "@/lib/utils";
import { getDeliveryTiming } from "@/lib/deliveryTiming";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const QUICK_CODES = ["WELCOME10", "SUMMER15", "CSL5"];
const TAX = 0.0825;

interface AddrForm { street: string; city: string; state: string; zip: string }
const BLANK_ADDR: AddrForm = { street: "", city: "Leander", state: "TX", zip: "" };

function Field({ label, value, onChange, placeholder, error, type = "text", readOnly }: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; error?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${readOnly ? "bg-gray-50 text-gray-500" : ""}`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
      className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
}: {
  orderNumber: string;
  total: number;
  customerName: string;
  onTrack: () => void;
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
          <p className="text-white/80 text-sm mt-1.5">Your order has been received</p>

          {/* Order badge */}
          <div className="mt-5 inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-5 py-2">
            <span className="text-xs text-white/70 font-mono tracking-wider">#{orderNumber}</span>
            <span className="text-white/40">·</span>
            <span className="text-sm font-black text-white">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* White body */}
        <div className="px-8 py-7 space-y-5">
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
            <p className="text-sm text-gray-700 font-medium">Our team is preparing your order now</p>
          </div>

          {/* CTA */}
          <button
            onClick={onTrack}
            className="w-full flex items-center justify-center gap-2.5 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg shadow-orange-500/25"
          >
            <MapPin size={18} />
            Track My Order
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckoutForm() {
  const { items, clearCart } = useCartStore();
  const { user, isLoggedIn } = useAuthStore();
  const router = useRouter();

  // Contact info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Delivery address
  const [delivery, setDelivery] = useState<AddrForm>(BLANK_ADDR);

  // Billing address
  const [sameBilling, setSameBilling] = useState(true);
  const [billing, setBilling] = useState<AddrForm>(BLANK_ADDR);

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

  const [showSummary, setShowSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderPayload, setOrderPayload] = useState<object | null>(null);
  const [thankYouOrder, setThankYouOrder] = useState<{ orderId: string; orderNumber: string; total: number } | null>(null);

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
    const finalBilling = rp?.billingAddress ?? u?.billingAddress;
    const finalSameBilling = rp?.billingAddressSameAsDelivery ?? u?.billingAddressSameAsDelivery;
    if (finalName) setName(finalName);
    if (finalEmail) setEmail(finalEmail);
    if (finalPhone) setPhone(finalPhone);
    if (finalDelivery?.street) setDelivery(finalDelivery);
    if (finalBilling?.street) setBilling(finalBilling);
    if (finalSameBilling !== undefined) setSameBilling(finalSameBilling);
  }, [user, reorderPrefill]);

  // Delivery timing — computed once per render (updates each page load)
  const timing = useMemo(() => getDeliveryTiming(), []);

  // Bundle tiers — fetched once from store (admin-configurable)
  const [bundleTiers, setBundleTiers] = useState<{ id: string; minQty: number; discountPct: number; sortOrder: number }[]>([]);
  useEffect(() => {
    fetch("/api/deals/bundle-tiers").then(r => r.json()).then(setBundleTiers).catch(() => {});
  }, []);

  // Totals — delivery always FREE, minimum order $20
  const { subtotal, flashSavings, bundlePct, bundleDiscount, promoBaseSubtotal } = calcDiscounts(
    items.map(i => ({ price: i.product.price, salePrice: i.product.salePrice, bundleEligible: i.product.bundleEligible, quantity: i.quantity })),
    bundleTiers,
  );
  const totalQty = items.reduce((a, i) => a + i.quantity, 0);
  const tax = subtotal * TAX;
  const total = Math.max(0, subtotal - bundleDiscount - promoDiscount + tax);
  const pointsEarned = Math.floor(total * 10);
  const meetsMinimum = subtotal >= MIN_ORDER;
  const amountToMin = Math.max(0, MIN_ORDER - subtotal);

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

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name required";
    if (!email.includes("@")) e.email = "Valid email required";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "Phone number required";
    if (!delivery.street.trim()) e.street = "Street address required";
    else if (!/^\d+\s/.test(delivery.street.trim())) e.street = "Please include your house/building number (e.g. 1221 Sonny Dr)";
    if (!delivery.city.trim()) e.city = "City required";
    if (!/^\d{5}$/.test(delivery.zip)) e.zip = "Valid ZIP code required";
    if (!sameBilling) {
      if (!billing.street.trim()) e.billStreet = "Billing street required";
      else if (!/^\d+\s/.test(billing.street.trim())) e.billStreet = "Please include your house/building number";
      if (!/^\d{5}$/.test(billing.zip)) e.billZip = "Billing ZIP required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setZoneError(null);

    // Validate delivery zone BEFORE creating Stripe PaymentIntent
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

    try {
      const payload = {
        items: items.map(i => ({ productId: i.product.id, name: i.product.name, price: i.product.salePrice ?? i.product.price, quantity: i.quantity })),
        deliveryAddress: delivery,
        billingAddress: sameBilling ? delivery : billing,
        billingAddressSameAsDelivery: sameBilling,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        couponCode: promoCode,
        couponDiscount: promoDiscount,
      };
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrderPayload(payload);
      setClientSecret(data.clientSecret);
    } catch {
      alert("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (thankYouOrder) {
    return (
      <ThankYouPopup
        orderNumber={thankYouOrder.orderNumber}
        total={thankYouOrder.total}
        customerName={name}
        onTrack={() => router.push(`/track/${thankYouOrder.orderId}`)}
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
          orderPayload={orderPayload!}
          total={total}
          onSuccess={(order) => {
            clearCart();
            setThankYouOrder({
              orderId: order.id,
              orderNumber: order.orderNumber,
              total: order.total,
            });
          }}
          onCancel={() => { setClientSecret(null); setOrderPayload(null); setSubmitting(false); }}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">

      {/* Reorder prefill notice */}
      {reorderFromOrder && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-blue-800">
          <RefreshCw size={16} className="shrink-0 text-blue-600" />
          <span>Reordering from <strong>#{reorderFromOrder}</strong> — your previous delivery info has been pre-filled.</span>
        </div>
      )}

      {/* Auto-fill notice */}
      {!reorderFromOrder && isLoggedIn && user?.deliveryAddress?.street && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle size={16} className="shrink-0 text-green-600" />
          <span>Your saved info has been auto-filled. <button type="button" onClick={() => { setDelivery(BLANK_ADDR); setName(""); setEmail(""); setPhone(""); }} className="underline font-medium">Clear</button></span>
        </div>
      )}
      {!isLoggedIn && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <Link href="/auth/login" className="font-semibold underline">Sign in</Link> to auto-fill your info and save your address for next time.
        </div>
      )}

      {/* Contact Info */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
          <User size={18} className="text-brand-500" /> Contact Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Full Name" value={name} onChange={setName} placeholder="John Smith" error={errors.name} />
          </div>
          <Field label="Email" value={email} onChange={setEmail} placeholder="john@example.com" type="email" error={errors.email} />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="(512) 555-0100" type="tel" error={errors.phone} />
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
          <MapPin size={18} className="text-brand-500" /> Delivery Address
        </h2>
        <AddressFields addr={delivery} onChange={(a) => { setDelivery(a); setZoneError(null); }} prefix="delivery" />
        {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
        {errors.zip && <p className="text-red-500 text-xs mt-1">{errors.zip}</p>}
        {zoneError && (
          <div className="mt-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{zoneError}</span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Service area: Leander · Cedar Park · Liberty Hill, TX (within 10 miles of store)</p>
      </div>

      {/* Billing Address */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <BillingIcon size={18} className="text-brand-500" /> Billing Address
        </h2>
        <label className="flex items-center gap-2.5 cursor-pointer mb-4">
          <input type="checkbox" checked={sameBilling} onChange={e => setSameBilling(e.target.checked)}
            className="w-4 h-4 accent-brand-500 rounded" />
          <span className="text-sm font-medium">Same as Delivery Address</span>
        </label>
        {!sameBilling && (
          <div className="mt-2">
            <AddressFields addr={billing} onChange={setBilling} prefix="billing" />
            {errors.billStreet && <p className="text-red-500 text-xs mt-1">{errors.billStreet}</p>}
            {errors.billZip && <p className="text-red-500 text-xs mt-1">{errors.billZip}</p>}
          </div>
        )}
        {sameBilling && delivery.street && (
          <p className="text-sm text-gray-500 bg-gray-50 border rounded-lg px-4 py-2.5">
            {delivery.street}, {delivery.city}, {delivery.state} {delivery.zip}
          </p>
        )}
      </div>

      {/* Promo Code */}
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold text-base mb-4 flex items-center gap-2">
          <Tag size={18} className="text-brand-500" /> Promo Code
          <span className="text-xs font-normal text-gray-400 ml-1">(optional)</span>
        </h2>
        {promoCode ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle size={18} className="text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-green-700 text-sm">{promoCode} applied!</p>
              <p className="text-xs text-green-600">{promoMsg}</p>
            </div>
            <button type="button" onClick={() => { setPromoCode(null); setPromoDiscount(0); setPromoMsg(""); setPromoInput(""); clearPromo(); }} className="text-xs text-gray-400 hover:text-red-500 underline">Remove</button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyPromo())}
                placeholder="WELCOME10" className="flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase placeholder:normal-case" />
              <button type="button" onClick={applyPromo} disabled={applyingPromo || !promoInput.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                {applyingPromo ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
              </button>
            </div>
            {promoError && <p className="text-red-500 text-xs mt-2">{promoError}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              <p className="text-xs text-gray-400 w-full">Try:</p>
              {QUICK_CODES.map(c => (
                <button key={c} type="button" onClick={() => { setPromoInput(c); setPromoError(""); }}
                  className="text-xs bg-gray-100 hover:bg-brand-50 hover:text-brand-600 text-gray-600 font-mono px-3 py-1 rounded-full border border-gray-200">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="bg-white border rounded-xl p-5">
        <button type="button" onClick={() => setShowSummary(s => !s)}
          className="w-full flex items-center justify-between font-bold text-base">
          <span>Order Summary</span>
          <div className="flex items-center gap-2 text-brand-600">
            <span>{formatCurrency(total)}</span>
            {showSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showSummary && (
          <div className="mt-4 space-y-2 text-sm border-t pt-4">
            <div className="flex justify-between text-gray-600"><span>Subtotal ({totalQty} items)</span><span>{formatCurrency(subtotal)}</span></div>
            {flashSavings > 0 && <div className="flex justify-between text-red-500 font-medium"><span>⚡ Flash Sale savings</span><span>-{formatCurrency(flashSavings)}</span></div>}
            {bundleDiscount > 0 && <div className="flex justify-between text-purple-600 font-medium"><span>📦 Bundle discount ({Math.round(bundlePct * 100)}%)</span><span>-{formatCurrency(bundleDiscount)}</span></div>}
            {promoDiscount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>🏷️ Promo ({promoCode})</span><span>-{formatCurrency(promoDiscount)}</span></div>}
            <div className="flex justify-between font-bold text-green-600">
              <span>🚚 Delivery Fee</span>
              <span>FREE</span>
            </div>
            <div className="flex justify-between text-green-600 font-bold"><span>💰 Tip</span><span>NOT Required</span></div>
            <div className="flex justify-between text-gray-600"><span>Tax (8.25%)</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
            {(flashSavings + bundleDiscount + promoDiscount) > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-center">
                <p className="text-xs text-green-700 font-semibold">You save {formatCurrency(flashSavings + bundleDiscount + promoDiscount)} on this order!</p>
              </div>
            )}
            <p className="text-xs text-center text-brand-600 font-medium pt-1">🏆 You&apos;ll earn <strong>{pointsEarned} CS Points</strong> on this order</p>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-bold text-base mb-5 flex items-center gap-2">
          <CreditCard size={18} className="text-brand-500" /> Payment
        </h2>
        <div className="bg-gray-50 border border-dashed rounded-xl p-6 text-center text-gray-400 text-sm">
          Fill in your details above and click &ldquo;Place Order&rdquo; to enter payment.
          <p className="text-xs mt-2">Credit Card · Debit Card · Apple Pay · Google Pay</p>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          ⚠️ Must be 21+. Valid ID checked at delivery.
        </div>
      </div>

      {/* Perks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {[
          { e: "🚚", t: "FREE Delivery" },
          { e: "💰", t: "No Tip" },
          { e: "🏆", t: `+${pointsEarned} Points` },
          { e: "⚡", t: timing.type === "same-day" ? "10–30 Min" : "Next Morning" },
        ].map(({ e, t }) => (
          <div key={t} className="bg-white border rounded-xl py-3 px-2">
            <p className="text-xl">{e}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{t}</p>
          </div>
        ))}
      </div>

      {/* Delivery timing message */}
      {timing.type === "same-day" ? (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <Clock size={16} className="shrink-0 text-green-600" />
          <span>{timing.message}</span>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500 mt-0.5" />
          <span>{timing.message}</span>
        </div>
      )}

      {/* Minimum order block */}
      {!meetsMinimum && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 text-center">
          <p className="font-bold text-amber-800 text-base mb-1">⚠️ Minimum order not met</p>
          <p className="text-amber-700 text-sm mb-3">
            Add <strong>{formatCurrency(amountToMin)}</strong> more to place your order.
            <br />Minimum order is <strong>$20.00</strong> · Delivery always FREE.
          </p>
          <Link href="/products"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
            + Add More Items
          </Link>
        </div>
      )}

      {!clientSecret && (
        <button type="submit" disabled={submitting || items.length === 0 || !meetsMinimum}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg shadow-brand-500/30">
          {submitting ? <><Loader2 size={20} className="animate-spin" />Processing...</> : `Place Order · ${formatCurrency(total)}`}
        </button>
      )}
    </form>
  );
}

function StripePaymentForm({ clientSecret, orderPayload, total, onSuccess, onCancel }: {
  clientSecret: string;
  orderPayload: object;
  total: number;
  onSuccess: (order: { id: string; orderNumber: string; total: number }) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        setPayError(error.message ?? "Payment failed.");
        setPaying(false);
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...orderPayload, stripePaymentIntentId: paymentIntent.id }),
        });
        const order = await res.json();
        onSuccess(order);
      }
    } catch {
      setPayError("Something went wrong. Please try again.");
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      {/* Header */}
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <CreditCard size={20} className="text-brand-500" /> Payment
          </h2>
          <span className="font-black text-2xl text-gray-900">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">Pay securely with Card or Klarna (buy now, pay later)</p>

        <PaymentElement options={{ layout: "tabs" }} />

        {payError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" /> {payError}
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: "🔒", label: "SSL Encrypted" },
          { icon: "✅", label: "Powered by Stripe" },
          { icon: "🛡️", label: "Secure Checkout" },
        ].map(({ icon, label }) => (
          <div key={label} className="bg-gray-50 border rounded-xl py-2.5 px-2">
            <p className="text-lg">{icon}</p>
            <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={paying}
          className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
          ← Back
        </button>
        <button type="submit" disabled={paying || !stripe}
          className="flex-[2] flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 text-base">
          {paying
            ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
            : <>Pay {formatCurrency(total)} →</>}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">
        🔒 Your payment is encrypted and secure. Must be 21+, valid ID checked at delivery.
      </p>
    </form>
  );
}
