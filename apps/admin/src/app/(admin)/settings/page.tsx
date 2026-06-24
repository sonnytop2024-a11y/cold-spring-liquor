"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store, Truck, ShoppingCart, Bell, Car, CreditCard, Star, Users, Settings,
  Save, RotateCcw, CheckCircle, AlertCircle, Volume2, VolumeX, ChevronRight,
  Clock, Globe, Phone, Mail, MapPin,
} from "lucide-react";

import { API } from "@/lib/api";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Settings = {
  storeName: string; storeAddress: string; storePhone: string; storeEmail: string;
  websiteDomain: string;
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;
  deliveryRadius: number; deliveryTimeMin: number; deliveryTimeMax: number;
  freeDeliveryEnabled: boolean; noTipRequired: boolean; minOrderAmount: number;
  ageVerificationRequired: boolean; dobRequired: boolean;
  billingAddressRequired: boolean; deliveryAddressRequired: boolean;
  promoCodeEnabled: boolean; rewardsEnabled: boolean; orderNotesEnabled: boolean;
  newOrderSoundEnabled: boolean; newOrderPopupEnabled: boolean; newOrderBadgeEnabled: boolean;
  driverOnlineStatusEnabled: boolean; assignOnlineDriversOnly: boolean;
  salesTaxPercent: number; onlinePaymentEnabled: boolean; cashOnDeliveryEnabled: boolean;
  stripePublishableKey: string;
  rewardClubName: string; promoCodesEnabled: boolean; giftCodesEnabled: boolean;
  birthdayRewardEnabled: boolean;
  signupByEmail: boolean; signupByPhone: boolean; signupByGoogle: boolean;
  deliveryCutoffHour: number; deliveryCutoffMinute: number;
  nextMorningMessage: string; sundayClosedMessage: string;
  notifySmsEnabled: boolean; notifyEmailEnabled: boolean; notifyPushEnabled: boolean;
  waitTimerMinutes: number;
  msgOnTheWay: string; msgArrivingSoon: string; msgArrived: string;
  updatedAt: string;
};

type Tab = "store" | "delivery" | "checkout" | "notifications" | "driver" | "payment" | "rewards" | "account" | "system";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "store",         label: "Store Info",     icon: Store },
  { id: "delivery",      label: "Delivery",        icon: Truck },
  { id: "checkout",      label: "Checkout",        icon: ShoppingCart },
  { id: "notifications", label: "Notifications",   icon: Bell },
  { id: "driver",        label: "Driver",          icon: Car },
  { id: "payment",       label: "Tax & Payment",   icon: CreditCard },
  { id: "rewards",       label: "Rewards",         icon: Star },
  { id: "account",       label: "Account",         icon: Users },
  { id: "system",        label: "System",          icon: Settings },
];

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-brand-500" : "bg-gray-200"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b last:border-0">
      <div className="sm:w-48 shrink-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Input({ value, onChange, type = "text", placeholder, prefix }: {
  value: string | number; onChange: (v: string) => void; type?: string;
  placeholder?: string; prefix?: string;
}) {
  return (
    <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 bg-white">
      {prefix && <span className="px-3 text-sm text-gray-500 border-r bg-gray-50 h-full flex items-center py-2">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b bg-gray-50 flex items-center gap-2">
        <Icon size={16} className="text-brand-500" />
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

function playTestSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.18, 0.36].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.15);
    });
  } catch {}
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("store");
  const [form, setForm] = useState<Settings | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [resetConfirm, setResetConfirm] = useState(false);

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: () => fetch(`${API}/admin/settings`).then(r => r.json()),
  });

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: (settings: Settings) =>
      fetch(`${API}/admin/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }).then(r => r.json()),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: (saved: Settings) => {
      setForm(saved);
      qc.setQueryData(["admin-settings"], saved);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: () => {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => fetch(`${API}/admin/settings`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: (defaults: Settings) => {
      setForm(defaults);
      qc.setQueryData(["admin-settings"], defaults);
      setResetConfirm(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
  });

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev);
  }, []);

  const setHours = useCallback((day: string, field: "open" | "close" | "closed", value: string | boolean) => {
    setForm(prev => {
      if (!prev) return prev;
      return { ...prev, businessHours: { ...prev.businessHours, [day]: { ...prev.businessHours[day], [field]: value } } };
    });
  }, []);

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Settings size={32} className="mx-auto mb-3 animate-spin opacity-30" />
          <p>Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Last updated: {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "Never"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={14} /> Reset to Defaults
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 font-medium">Reset all settings?</span>
              <button onClick={() => resetMutation.mutate()} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Yes, Reset</button>
              <button onClick={() => setResetConfirm(false)} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          )}
          <button
            onClick={() => form && saveMutation.mutate(form)}
            disabled={saveStatus === "saving"}
            className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-colors text-white ${
              saveStatus === "saving" ? "bg-gray-400 cursor-wait" :
              saveStatus === "saved" ? "bg-green-500" :
              saveStatus === "error" ? "bg-red-500" :
              "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {saveStatus === "saved" ? <><CheckCircle size={14} /> Saved!</> :
             saveStatus === "error" ? <><AlertCircle size={14} /> Error</> :
             <><Save size={14} /> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Save banner */}
      {saveStatus === "saved" && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={16} />
          <span>Settings saved successfully and will take effect immediately.</span>
        </div>
      )}
      {saveStatus === "error" && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} />
          <span>Failed to save settings. Please try again.</span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <nav className="w-48 shrink-0 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                tab === id ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
              {tab !== id && <ChevronRight size={12} className="ml-auto text-gray-400" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-4">

          {/* ── STORE INFO ─────────────────────────────────────── */}
          {tab === "store" && (
            <>
              <SectionCard title="Store Information" icon={Store}>
                <Field label="Store Name">
                  <Input value={form.storeName} onChange={v => set("storeName", v)} placeholder="Cold Spring Liquor" />
                </Field>
                <Field label="Store Address" description="Full street address">
                  <Input value={form.storeAddress} onChange={v => set("storeAddress", v)} placeholder="15609 Ronald Reagan Blvd…" />
                </Field>
                <Field label="Phone Number">
                  <Input value={form.storePhone} onChange={v => set("storePhone", v)} placeholder="(512) 444-1000" />
                </Field>
                <Field label="Email Address">
                  <Input value={form.storeEmail} onChange={v => set("storeEmail", v)} type="email" placeholder="info@coldspringliquor.com" />
                </Field>
                <Field label="Website Domain">
                  <Input value={form.websiteDomain} onChange={v => set("websiteDomain", v)} placeholder="coldspringliquor.com" />
                </Field>
              </SectionCard>

              <SectionCard title="Business Hours" icon={Clock}>
                <div className="py-2 space-y-0">
                  {DAYS.map(day => {
                    const h = form.businessHours[day] ?? { open: "10:00", close: "22:00", closed: false };
                    return (
                      <div key={day} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                        <div className="w-24 shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setHours(day, "closed", !h.closed)}
                            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${!h.closed ? "bg-brand-500" : "bg-gray-200"}`}
                          >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${!h.closed ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                          <span className="text-sm font-medium text-gray-700 w-12">{day.slice(0, 3)}</span>
                        </div>
                        {h.closed ? (
                          <span className="text-sm text-gray-400 italic">Closed</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input type="time" value={h.open} onChange={e => setHours(day, "open", e.target.value)}
                              className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                            <span className="text-gray-400 text-sm">to</span>
                            <input type="time" value={h.close} onChange={e => setHours(day, "close", e.target.value)}
                              className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard title="Store Logo" icon={Store}>
                <div className="py-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400">
                    <Store size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Upload Store Logo</p>
                    <p className="text-xs text-gray-500 mt-0.5">Recommended: 256×256px PNG or SVG</p>
                    <button className="mt-2 text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">
                      Choose File
                    </button>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── DELIVERY ───────────────────────────────────────── */}
          {tab === "delivery" && (
            <>
            <SectionCard title="Delivery Settings" icon={Truck}>
              <Field label="Delivery Radius" description="Maximum miles for delivery">
                <Input value={form.deliveryRadius} onChange={v => set("deliveryRadius", Number(v))} type="number" prefix="miles" />
              </Field>
              <Field label="Same-Day Delivery Time" description="Normal estimated range when store is open">
                <div className="flex items-center gap-2">
                  <input type="number" value={form.deliveryTimeMin} onChange={e => set("deliveryTimeMin", Number(e.target.value))}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="number" value={form.deliveryTimeMax} onChange={e => set("deliveryTimeMax", Number(e.target.value))}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <span className="text-sm text-gray-500">minutes</span>
                </div>
              </Field>
              <Field label="Minimum Order" description="Block checkout if order is below this">
                <Input value={form.minOrderAmount} onChange={v => set("minOrderAmount", Number(v))} type="number" prefix="$" />
                <p className="text-xs text-gray-500 mt-1">Customers see: "Add items to reach ${form.minOrderAmount} minimum."</p>
              </Field>
              <Toggle checked={form.freeDeliveryEnabled} onChange={v => set("freeDeliveryEnabled", v)}
                label="Free Delivery Enabled" description="Show FREE on all checkout delivery lines" />
              <Toggle checked={form.noTipRequired} onChange={v => set("noTipRequired", v)}
                label="No Tip Required" description="Remove tip prompt from checkout" />
            </SectionCard>

            <SectionCard title="Delivery Cutoff & Hours" icon={Clock}>
              <div className="py-2 space-y-0.5">
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3 text-sm text-blue-700">
                  <p className="font-semibold mb-1">Current Store Hours</p>
                  <p>Mon–Sat: 10:00 AM – 9:00 PM &nbsp;|&nbsp; Sunday: <strong>Closed</strong></p>
                </div>
              </div>
              <Field label="Delivery Cutoff Time" description="Orders after this time → next business morning">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={23} value={form.deliveryCutoffHour ?? 20}
                    onChange={e => set("deliveryCutoffHour", Number(e.target.value))}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <span className="text-gray-400">:</span>
                  <input type="number" min={0} max={59} value={form.deliveryCutoffMinute ?? 30}
                    onChange={e => set("deliveryCutoffMinute", Number(e.target.value))}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <span className="text-sm text-gray-500">
                    = {String(form.deliveryCutoffHour ?? 20).padStart(2,"0")}:{String(form.deliveryCutoffMinute ?? 30).padStart(2,"0")} (24-hr)
                    &nbsp;= {((form.deliveryCutoffHour ?? 20) % 12) || 12}:{String(form.deliveryCutoffMinute ?? 30).padStart(2,"0")} {(form.deliveryCutoffHour ?? 20) >= 12 ? "PM" : "AM"}
                  </span>
                </div>
              </Field>
              <Field label="Near-Closing Message" description="Shown to customers ordering past cutoff (Mon–Sat)">
                <textarea
                  value={form.nextMorningMessage ?? ""}
                  onChange={e => set("nextMorningMessage", e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </Field>
              <Field label="Sunday Closed Message" description="Shown to customers ordering on Sunday">
                <textarea
                  value={form.sundayClosedMessage ?? ""}
                  onChange={e => set("sundayClosedMessage", e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </Field>
            </SectionCard>
            </>
          )}

          {/* ── CHECKOUT ───────────────────────────────────────── */}
          {tab === "checkout" && (
            <SectionCard title="Checkout Settings" icon={ShoppingCart}>
              <Toggle checked={form.ageVerificationRequired} onChange={v => set("ageVerificationRequired", v)}
                label="21+ Age Verification Required" description="Customer must confirm they are 21 or older" />
              <Toggle checked={form.dobRequired} onChange={v => set("dobRequired", v)}
                label="Date of Birth Required" description="Collect DOB at checkout for age verification" />
              <Toggle checked={form.billingAddressRequired} onChange={v => set("billingAddressRequired", v)}
                label="Billing Address Required" description="Customer must enter a billing address" />
              <Toggle checked={form.deliveryAddressRequired} onChange={v => set("deliveryAddressRequired", v)}
                label="Delivery Address Required" description="Customer must enter a delivery address" />
              <Toggle checked={form.promoCodeEnabled} onChange={v => set("promoCodeEnabled", v)}
                label="Promo Code Enabled" description="Show promo code input field at checkout" />
              <Toggle checked={form.rewardsEnabled} onChange={v => set("rewardsEnabled", v)}
                label="Rewards / Gift Code Enabled" description="Allow CS Reward points and gift codes at checkout" />
              <Toggle checked={form.orderNotesEnabled} onChange={v => set("orderNotesEnabled", v)}
                label="Order Notes Enabled" description="Let customers add a note with their order" />
            </SectionCard>
          )}

          {/* ── NOTIFICATIONS ──────────────────────────────────── */}
          {tab === "notifications" && (
            <>
              <SectionCard title="Order Notification Settings" icon={Bell}>
                <Toggle checked={form.newOrderSoundEnabled} onChange={v => set("newOrderSoundEnabled", v)}
                  label="New Order Sound Alert" description="Play a beep sound when a new order arrives" />
                <Toggle checked={form.newOrderPopupEnabled} onChange={v => set("newOrderPopupEnabled", v)}
                  label="Admin Popup Notification" description="Show a popup banner for each new order" />
                <Toggle checked={form.newOrderBadgeEnabled} onChange={v => set("newOrderBadgeEnabled", v)}
                  label="New Order Badge Count" description="Show unread badge on Orders menu item" />
              </SectionCard>

              <SectionCard title="Test Notification Sound" icon={Volume2}>
                <div className="py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Test Alert Sound</p>
                    <p className="text-xs text-gray-500 mt-0.5">Click to hear the new order beep</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={playTestSound}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors"
                    >
                      <Volume2 size={14} /> Test Sound
                    </button>
                    {!form.newOrderSoundEnabled && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <VolumeX size={13} /> Sound is off
                      </span>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Customer Delivery Notifications" icon={Bell}>
                <Toggle checked={form.notifySmsEnabled ?? true} onChange={v => set("notifySmsEnabled", v)}
                  label="SMS Notifications" description="Send SMS to customer when driver is on the way / arriving / arrived" />
                <Toggle checked={form.notifyEmailEnabled ?? true} onChange={v => set("notifyEmailEnabled", v)}
                  label="Email Notifications" description="Send email to customer at key delivery milestones" />
                <Toggle checked={form.notifyPushEnabled ?? false} onChange={v => set("notifyPushEnabled", v)}
                  label="Push Notifications" description="Browser push notifications (requires VAPID keys in production)" />
                <Field label="Driver Wait Time (minutes)" description="How long driver waits at customer door before marking failed">
                  <Input value={form.waitTimerMinutes ?? 5} onChange={v => set("waitTimerMinutes", Number(v))} type="number" />
                </Field>
              </SectionCard>

              <SectionCard title="Delivery Notification Messages" icon={Phone}>
                <Field label="Driver On The Way Message" description="Sent to customer when driver status → Out for Delivery">
                  <textarea
                    value={form.msgOnTheWay ?? ""}
                    onChange={e => set("msgOnTheWay", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </Field>
                <Field label="Driver Arriving Soon Message" description="Sent to customer when driver taps 'I'm Almost There'">
                  <textarea
                    value={form.msgArrivingSoon ?? ""}
                    onChange={e => set("msgArrivingSoon", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </Field>
                <Field label="Driver Arrived Message" description="Sent to customer when driver taps 'I've Arrived'">
                  <textarea
                    value={form.msgArrived ?? ""}
                    onChange={e => set("msgArrived", e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </Field>
              </SectionCard>
            </>
          )}

          {/* ── DRIVER ─────────────────────────────────────────── */}
          {tab === "driver" && (
            <SectionCard title="Driver Settings" icon={Car}>
              <Toggle checked={form.driverOnlineStatusEnabled} onChange={v => set("driverOnlineStatusEnabled", v)}
                label="Driver Online/Offline Status" description="Drivers can toggle their availability in the driver app" />
              <Toggle checked={form.assignOnlineDriversOnly} onChange={v => set("assignOnlineDriversOnly", v)}
                label="Assign Online Drivers Only" description="Offline drivers cannot receive new order assignments" />
              <div className="py-3">
                <p className="text-sm font-medium text-gray-800 mb-1">Driver History Display</p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 space-y-1">
                  <p className="font-semibold">Current Configuration:</p>
                  <p>✓ Driver history shows: <strong>Total Orders</strong> + <strong>Total Order Amount</strong></p>
                  <p>✓ 15% driver compensation display removed from all views</p>
                  <p>✓ Drivers are paid hourly — no percentage calculation</p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── TAX & PAYMENT ──────────────────────────────────── */}
          {tab === "payment" && (
            <>
              <SectionCard title="Tax Settings" icon={CreditCard}>
                <Field label="Sales Tax Rate" description="Applied to all taxable items">
                  <Input value={form.salesTaxPercent} onChange={v => set("salesTaxPercent", Number(v))} type="number" prefix="%" />
                  <p className="text-xs text-gray-500 mt-1">Texas standard rate: 8.25%</p>
                </Field>
              </SectionCard>

              <SectionCard title="Payment Methods" icon={CreditCard}>
                <Toggle checked={form.onlinePaymentEnabled} onChange={v => set("onlinePaymentEnabled", v)}
                  label="Online Payment (Card)" description="Accept credit/debit cards via payment gateway" />
                <Toggle checked={form.cashOnDeliveryEnabled} onChange={v => set("cashOnDeliveryEnabled", v)}
                  label="Cash / Card on Delivery" description="Driver collects payment at the door" />
              </SectionCard>

              <SectionCard title="Payment Gateway" icon={Globe}>
                <Field label="Stripe Publishable Key" description="Your pk_live_… or pk_test_… key">
                  <Input value={form.stripePublishableKey} onChange={v => set("stripePublishableKey", v)} placeholder="pk_live_…" />
                </Field>
                <div className="py-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
                    <p className="font-semibold mb-1">Payment Integration</p>
                    <p>Add your Stripe keys above to enable live card processing. Test with <code className="bg-yellow-100 px-1 rounded">pk_test_…</code> keys during development.</p>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── REWARDS ────────────────────────────────────────── */}
          {tab === "rewards" && (
            <SectionCard title="Reward & Coupon Settings" icon={Star}>
              <Field label="Reward Club Name">
                <Input value={form.rewardClubName} onChange={v => set("rewardClubName", v)} placeholder="CS Reward Club" />
              </Field>
              <Toggle checked={form.promoCodesEnabled} onChange={v => set("promoCodesEnabled", v)}
                label="Promo Codes Enabled" description="Allow promo codes site-wide" />
              <Toggle checked={form.giftCodesEnabled} onChange={v => set("giftCodesEnabled", v)}
                label="Gift Codes Enabled" description="Allow gift card codes at checkout" />
              <Toggle checked={form.birthdayRewardEnabled} onChange={v => set("birthdayRewardEnabled", v)}
                label="Birthday Reward" description="Send special reward on customer birthdays" />
              <div className="py-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Reward Rate</p>
                <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-700">
                  <p>Customers earn <strong>10 points per $1</strong> spent.</p>
                  <p className="mt-1">Tiers: Bronze → Silver ($500) → Gold ($1,500) → Platinum ($3,000)</p>
                </div>
              </div>
              <div className="py-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Default Promo Codes</p>
                <div className="grid grid-cols-3 gap-2">
                  {["WELCOME10", "SUMMER15", "CSL5"].map(c => (
                    <div key={c} className="bg-gray-50 border rounded-lg px-3 py-2 text-xs font-mono font-semibold text-gray-700">{c}</div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Manage full coupon list in the Marketing section.</p>
              </div>
            </SectionCard>
          )}

          {/* ── ACCOUNT ────────────────────────────────────────── */}
          {tab === "account" && (
            <>
              <SectionCard title="Customer Sign Up Methods" icon={Users}>
                <Toggle checked={form.signupByEmail} onChange={v => set("signupByEmail", v)}
                  label="Sign Up by Email" description="Customers can register with email + password" />
                <Toggle checked={form.signupByPhone} onChange={v => set("signupByPhone", v)}
                  label="Sign Up by Phone" description="Customers can register / verify via SMS OTP" />
                <Toggle checked={form.signupByGoogle} onChange={v => set("signupByGoogle", v)}
                  label="Sign Up with Google" description="One-click Google OAuth registration" />
              </SectionCard>

              <SectionCard title="Account Management" icon={Settings}>
                <div className="py-3 space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Admin Accounts</p>
                      <p className="text-xs text-gray-500">Manage staff who access this admin panel</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Manage in Drivers page</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Driver Accounts</p>
                      <p className="text-xs text-gray-500">Add, edit, and deactivate driver accounts</p>
                    </div>
                    <a href="/drivers" className="text-xs bg-brand-50 text-brand-600 px-3 py-1 rounded-full border border-brand-200 hover:bg-brand-100">
                      Go to Drivers →
                    </a>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── SYSTEM ─────────────────────────────────────────── */}
          {tab === "system" && (
            <>
              <SectionCard title="System Status" icon={Settings}>
                <div className="py-3 space-y-2">
                  {[
                    { label: "Store Name",      value: form.storeName,                          icon: Store },
                    { label: "Phone",           value: form.storePhone || "—",                  icon: Phone },
                    { label: "Email",           value: form.storeEmail || "—",                  icon: Mail },
                    { label: "Address",         value: form.storeAddress || "—",                icon: MapPin },
                    { label: "Min Order",       value: `$${form.minOrderAmount}`,               icon: ShoppingCart },
                    { label: "Tax Rate",        value: `${form.salesTaxPercent}%`,              icon: CreditCard },
                    { label: "Delivery Radius", value: `${form.deliveryRadius} mi`,             icon: Truck },
                    { label: "Reward Club",     value: form.rewardClubName,                     icon: Star },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <Icon size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Save & Reset" icon={Save}>
                <div className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => form && saveMutation.mutate(form)}
                      disabled={saveStatus === "saving"}
                      className={`flex items-center justify-center gap-2 px-6 py-2.5 font-semibold text-sm rounded-lg text-white transition-colors ${
                        saveStatus === "saving" ? "bg-gray-400 cursor-wait" :
                        saveStatus === "saved" ? "bg-green-500" : "bg-brand-500 hover:bg-brand-600"
                      }`}
                    >
                      {saveStatus === "saved" ? <><CheckCircle size={15} /> Settings Saved!</> :
                       <><Save size={15} /> Save All Settings</>}
                    </button>

                    <button
                      onClick={() => setResetConfirm(true)}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 font-medium text-sm rounded-lg border text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <RotateCcw size={15} /> Reset to Defaults
                    </button>
                  </div>

                  {resetConfirm && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-red-700 mb-2">Reset all settings to factory defaults?</p>
                      <p className="text-xs text-red-600 mb-3">This cannot be undone. All custom settings will be lost.</p>
                      <div className="flex gap-2">
                        <button onClick={() => resetMutation.mutate()} className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">Yes, Reset Everything</button>
                        <button onClick={() => setResetConfirm(false)} className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 pt-1">
                    Last saved: {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "Never"}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Technical Info" icon={Globe}>
                <div className="py-3 space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-gray-500">Data Store</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">csl-mock-store.json</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-gray-500">Web API</span>
                    <span className="text-gray-700">localhost:3000/api</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-gray-500">Admin Panel</span>
                    <span className="text-gray-700">localhost:3001</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500">Driver App</span>
                    <span className="text-gray-700">localhost:3002</span>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
