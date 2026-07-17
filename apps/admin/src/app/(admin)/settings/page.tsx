"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store, Truck, ShoppingCart, Bell, Car, CreditCard, Star, Users, Settings,
  Save, RotateCcw, CheckCircle, AlertCircle, Volume2, VolumeX, ChevronRight,
  Clock, Globe, Phone, Mail, MapPin, Upload, CloudRain, Sparkles, Sun,
} from "lucide-react";

import { API } from "@/lib/api";
import { formatPhoneUS } from "@/lib/phoneUtils";
import { enablePushNotifications, disablePushNotifications } from "@/components/PushRegistrar";
import { HeroWeatherPreview, type HeroWeatherConfig } from "@/components/HeroWeatherPreview";
import { HeroShowcaseEditor, type HeroShowcaseConfig } from "@/components/HeroShowcaseEditor";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_HERO_WEATHER: HeroWeatherConfig = {
  enabled: true,
  rain: { enabled: true, intensity: "light" },
  lightning: { enabled: false, frequency: "low" },
  opacity: 35,
};

type Settings = {
  storeName: string; storeAddress: string; storePhone: string; storeTextPhone?: string; storeEmail: string;
  websiteDomain: string; logoUrl?: string;
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;
  deliveryRadius: number; deliveryTimeMin: number; deliveryTimeMax: number;
  freeDeliveryEnabled: boolean; noTipRequired: boolean; minOrderAmount: number;
  deliveryEnabled?: boolean;
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
  notifyCallEnabled?: boolean; adminCallPhone?: string; callMaxAttempts?: number;
  waitTimerMinutes: number;
  msgOnTheWay: string; msgArrivingSoon: string; msgArrived: string;
  telegramBotToken?: string; telegramChatId?: string;
  heroWeather?: HeroWeatherConfig;
  heroShowcase?: HeroShowcaseConfig;
  heroDisplayMode?: "auto" | "day" | "night";
  updatedAt: string;
};

type Tab = "store" | "website" | "delivery" | "checkout" | "notifications" | "driver" | "payment" | "rewards" | "account" | "system";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "store",         label: "Store Info",     icon: Store },
  { id: "website",       label: "Website",         icon: Globe },
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
  placeholder?: string; prefix?: string; inputMode?: string;
}) {
  return (
    <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 bg-white">
      {prefix && <span className="px-3 text-sm text-gray-500 border-r bg-gray-50 h-full flex items-center py-2">{prefix}</span>}
      <input
        type={type}
        inputMode="decimal"
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

let _settingsAudioCtx: AudioContext | null = null;
async function playTestSound() {
  try {
    const ACtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!ACtx) return;
    if (!_settingsAudioCtx) _settingsAudioCtx = new ACtx();
    const ctx = _settingsAudioCtx;
    if (ctx.state === "suspended") await ctx.resume();
    const freqs = [660, 880, 1100];
    freqs.forEach((freq, i) => {
      const t = i * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      osc.connect(gain); gain.connect(comp); comp.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + t + 0.02);
      gain.gain.setValueAtTime(1.0, ctx.currentTime + t + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.26);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.28);
    });
  } catch {}
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("store");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [form, setForm] = useState<Settings | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "working" | "on" | "off">("idle");
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<string | null>(null);

  // Store logo upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setLogoError("Only JPG, PNG, or WEBP files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("File too large. Maximum 5 MB.");
      return;
    }
    setLogoError("");
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/admin/upload?folder=logos`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setLogoError(data.error ?? "Upload failed. Please try again.");
        return;
      }
      setForm(prev => prev ? { ...prev, logoUrl: data.url } : prev);
    } catch {
      setLogoError("Network error. Please try again.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: () => fetch(`${API}/admin/settings`).then(r => r.json()),
  });

  useEffect(() => {
    if (data && !form) setForm({ ...data, adminCallPhone: data.adminCallPhone ?? data.storeTextPhone ?? "" });
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

  // Check if push is already subscribed on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.getRegistration("/sw.js").then(async reg => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setPushStatus(sub ? "on" : "off");
    }).catch(() => {});
  }, []);

  async function handlePushToggle() {
    setPushStatus("working");
    if (pushStatus === "on") {
      await disablePushNotifications();
      setPushStatus("off");
    } else {
      const result = await enablePushNotifications();
      setPushStatus(result === "granted" ? "on" : "off");
    }
  }

  async function testTelegram() {
    setTelegramTesting(true);
    setTelegramTestResult(null);
    try {
      const token = form?.telegramBotToken?.trim();
      const chatId = form?.telegramChatId?.trim();
      if (!token || !chatId) { setTelegramTestResult("❌ Please save Bot Token and Chat ID first."); return; }
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "✅ Cold Spring Liquor — Telegram notifications are working!" }),
      });
      const json = await res.json();
      setTelegramTestResult(json.ok ? "✅ Message sent! Check your Telegram." : `❌ Error: ${json.description}`);
    } catch (e) { setTelegramTestResult(`❌ ${e}`); }
    finally { setTelegramTesting(false); }
  }

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
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">Settings</h1>
          <p className="text-xs text-gray-500">
            Last updated: {form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "Never"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={13} /> Reset
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">Reset all?</span>
              <button onClick={() => resetMutation.mutate()} className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">Yes</button>
              <button onClick={() => setResetConfirm(false)} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50">No</button>
            </div>
          )}
          <button
            onClick={() => form && saveMutation.mutate(form)}
            disabled={saveStatus === "saving"}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors text-white ${
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
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
          <CheckCircle size={14} />
          <span>Settings saved successfully.</span>
        </div>
      )}
      {saveStatus === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm">
          <AlertCircle size={14} />
          <span>Failed to save. Please try again.</span>
        </div>
      )}

      {/* ── Layout: mobile = master-detail, desktop = sidebar + content ── */}

      {/* Mobile nav list (hidden when detail is open or on desktop) */}
      <nav className={`md:hidden bg-white rounded-2xl border divide-y overflow-hidden ${mobileDetail ? "hidden" : "block"}`}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setMobileDetail(true); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tab === id ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>
              <Icon size={15} />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-800">{label}</span>
            <ChevronRight size={15} className="text-gray-400" />
          </button>
        ))}
      </nav>

      {/* Desktop sidebar + content, plus mobile detail view */}
      <div className="md:flex md:gap-6">
        {/* Desktop sidebar */}
        <nav className="hidden md:block md:w-48 md:shrink-0 md:space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                tab === id ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}>
              <Icon size={15} />
              <span>{label}</span>
              {tab !== id && <ChevronRight size={12} className="ml-auto text-gray-400" />}
            </button>
          ))}
        </nav>

        {/* Content area — hidden on mobile until a section is tapped */}
        <div className={`flex-1 space-y-4 ${mobileDetail ? "block" : "hidden md:block"}`}>
          {/* Mobile back button */}
          <button onClick={() => setMobileDetail(false)}
            className="md:hidden flex items-center gap-1.5 text-sm text-brand-600 font-medium mb-1">
            <ChevronRight size={14} className="rotate-180" />
            {TABS.find(t => t.id === tab)?.label ?? "Settings"}
          </button>

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
                <Field label="Phone Number" description="Main call number">
                  <Input value={form.storePhone} onChange={v => set("storePhone", formatPhoneUS(v))} placeholder="(512) 337-7051" />
                </Field>
                <Field label="Text Number" description="SMS / text number (optional)">
                  <Input value={form.storeTextPhone ?? ""} onChange={v => set("storeTextPhone", formatPhoneUS(v))} placeholder="(512) 720-2489" />
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
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                    {form?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoUrl} alt="Store Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Store size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Store Logo</p>
                    <p className="text-xs text-gray-500 mt-0.5">Recommended: 256×256px PNG · Max 5 MB</p>
                    <div className="flex gap-2 mt-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <Upload size={12} />
                        {logoUploading ? "Uploading…" : form?.logoUrl ? "Change Logo" : "Upload Logo"}
                      </button>
                      {form?.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => prev ? { ...prev, logoUrl: "" } : prev)}
                          className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {logoError && <p className="text-xs text-red-500 mt-1.5">{logoError}</p>}
                    {form?.logoUrl && !logoError && (
                      <p className="text-xs text-green-600 mt-1.5">✓ Logo uploaded — save settings to apply</p>
                    )}
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ── WEBSITE — Hero Weather Effects + Product Showcase ── */}
          {tab === "website" && (<>
          {/* ── WEBSITE — Hero Display Mode (day/night hero artwork) ── */}
          <SectionCard title="Hero Display Mode" icon={Sun}>
            <p className="text-sm text-gray-600 pb-3">
              Controls whether the homepage hero shows the daylight or night scene.
              Site-wide — applies to every customer on every device, no deploy needed.
            </p>
            <div className="space-y-2 pb-1">
              {([
                { val: "auto",  label: "Automatic Day/Night",
                  desc: "Day 6:00 AM – 5:59 PM · Night 6:00 PM – 5:59 AM (Central Time)", badge: "DEFAULT" },
                { val: "day",   label: "Always Day",
                  desc: "Forces the daylight hero at all times.", badge: "" },
                { val: "night", label: "Always Night",
                  desc: "Forces the current night hero at all times.", badge: "" },
              ] as { val: "auto" | "day" | "night"; label: string; desc: string; badge: string }[]).map(o => {
                const cur = form.heroDisplayMode ?? "auto";
                return (
                  <button key={o.val} type="button" onClick={() => set("heroDisplayMode", o.val)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      cur === o.val ? "border-brand-500 bg-orange-50" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}>
                    <span className={`w-4 h-4 rounded-full flex-none ${
                      cur === o.val ? "border-[5px] border-brand-500" : "border-2 border-gray-300"
                    }`} />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-gray-800">{o.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{o.desc}</span>
                    </span>
                    {o.badge && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        {o.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {(() => {
            const hw = form.heroWeather ?? DEFAULT_HERO_WEATHER;
            const setHW = (patch: Partial<HeroWeatherConfig>) =>
              set("heroWeather", { ...hw, ...patch });
            const pills = (
              options: { val: string; label: string }[],
              current: string,
              onPick: (val: string) => void,
              dimmed: boolean,
            ) => (
              <div className={`flex flex-wrap gap-2 pb-3 ${dimmed ? "opacity-40 pointer-events-none" : ""}`}>
                {options.map(o => (
                  <button key={o.val} type="button" onClick={() => onPick(o.val)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      current === o.val ? "bg-brand-500 border-brand-500 text-white" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {o.label}
                  </button>
                ))}
              </div>
            );
            return (
              <SectionCard title="Hero Weather Effects" icon={CloudRain}>
                <Toggle checked={hw.enabled} onChange={v => setHW({ enabled: v })}
                  label="Enable Weather Effect"
                  description="Master switch. When OFF, no rain or lightning is shown anywhere on the site." />

                <div className={hw.enabled ? "" : "opacity-40 pointer-events-none"}>
                  <Toggle checked={hw.rain.enabled} onChange={v => setHW({ rain: { ...hw.rain, enabled: v } })}
                    label="Rain Effect" description="Default: Light" />
                  {pills(
                    [{ val: "light", label: "Light" }, { val: "medium", label: "Medium" }, { val: "heavy", label: "Heavy" }],
                    hw.rain.intensity,
                    v => setHW({ rain: { ...hw.rain, intensity: v as HeroWeatherConfig["rain"]["intensity"] } }),
                    !hw.rain.enabled,
                  )}

                  <Toggle checked={hw.lightning.enabled} onChange={v => setHW({ lightning: { ...hw.lightning, enabled: v } })}
                    label="Lightning Effect" description="Default: OFF — turn on for special promotions/campaigns." />
                  {pills(
                    [{ val: "low", label: "Low (20–30s)" }, { val: "medium", label: "Medium (10–20s)" }, { val: "high", label: "High (5–10s)" }],
                    hw.lightning.frequency,
                    v => setHW({ lightning: { ...hw.lightning, frequency: v as HeroWeatherConfig["lightning"]["frequency"] } }),
                    !hw.lightning.enabled,
                  )}

                  <div className="py-3 border-b">
                    <p className="text-sm font-medium text-gray-800 mb-2">Effect Opacity</p>
                    <input type="range" min={10} max={100} value={hw.opacity}
                      onChange={e => setHW({ opacity: parseInt(e.target.value, 10) })}
                      className="w-full accent-brand-500" />
                    <p className="text-xs text-gray-500 mt-1">{hw.opacity}%</p>
                  </div>
                </div>

                <div className="py-4">
                  <p className="text-sm font-medium text-gray-800 mb-2">Live Preview</p>
                  <HeroWeatherPreview config={hw} />
                  <p className="text-xs text-gray-500 mt-2">
                    The public website updates only after you click Save Settings — no code deploy needed.
                  </p>
                </div>
              </SectionCard>
            );
          })()}
          <SectionCard title="Hero Product Showcase" icon={Sparkles}>
            <HeroShowcaseEditor
              value={form.heroShowcase}
              onChange={v => set("heroShowcase", v)}
              api={API}
            />
          </SectionCard>
          </>)}

          {/* ── DELIVERY ───────────────────────────────────────── */}
          {tab === "delivery" && (
            <>
            <SectionCard title="Delivery Settings" icon={Truck}>
              <Toggle checked={form.deliveryEnabled !== false} onChange={v => set("deliveryEnabled", v)}
                label={`Accept Delivery Orders — ${form.deliveryEnabled !== false ? "ON" : "OFF"}`}
                description="Turn off when no driver is available — customers can still order Pick Up In Store" />
              {form.deliveryEnabled === false && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
                  ⚠️ Delivery is OFF — customers can only place Pick Up orders until you turn this back on.
                </div>
              )}
              <Field label="Delivery Radius" description="Maximum miles for delivery">
                <Input value={form.deliveryRadius} onChange={v => set("deliveryRadius", Number(v))} type="text" inputMode="decimal" prefix="miles" />
              </Field>
              <Field label="Same-Day Delivery Time" description="Normal estimated range when store is open">
                <div className="flex items-center gap-2">
                  <input type="text" inputMode="decimal" value={form.deliveryTimeMin} onChange={e => set("deliveryTimeMin", Number(e.target.value))}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <span className="text-gray-400 text-sm">to</span>
                  <input type="text" inputMode="decimal" value={form.deliveryTimeMax} onChange={e => set("deliveryTimeMax", Number(e.target.value))}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <span className="text-sm text-gray-500">minutes</span>
                </div>
              </Field>
              <Field label="Minimum Order" description="Block checkout if order is below this">
                <Input value={form.minOrderAmount} onChange={v => set("minOrderAmount", Number(v))} type="text" inputMode="decimal" prefix="$" />
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
                  <input type="text" inputMode="decimal" min={0} max={23} value={form.deliveryCutoffHour ?? 20}
                    onChange={e => set("deliveryCutoffHour", Number(e.target.value))}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <span className="text-gray-400">:</span>
                  <input type="text" inputMode="decimal" min={0} max={59} value={form.deliveryCutoffMinute ?? 30}
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
                  <Input value={form.waitTimerMinutes ?? 5} onChange={v => set("waitTimerMinutes", Number(v))} type="text" inputMode="decimal" />
                </Field>
              </SectionCard>

              {/* ── Telegram ── */}
              <SectionCard title="Telegram Notifications (Owner Alerts)" icon={Bell}>
                <div className="py-2 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 space-y-1">
                    <p className="font-semibold">Setup (3 steps):</p>
                    <p>1. Open Telegram → find <strong>@BotFather</strong> → send <code>/mybots</code> → select your bot → <strong>API Token</strong></p>
                    <p>2. Paste the token below, then click <strong>"Get My Chat ID"</strong></p>
                    <p>3. Click <strong>Save Settings</strong> → then Test</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-800">Bot Token</p>
                    <p className="text-xs text-gray-500">From @BotFather → /mybots → API Token</p>
                    <input
                      type="text"
                      value={form.telegramBotToken ?? ""}
                      onChange={e => { set("telegramBotToken", e.target.value); setTelegramTestResult(null); }}
                      placeholder="1234567890:AABBCCDDEEFFxxYYZZ..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-800">Chat ID <span className="text-xs font-normal text-gray-400">(numeric, e.g. 123456789)</span></p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.telegramChatId ?? ""}
                        onChange={e => set("telegramChatId", e.target.value)}
                        placeholder="Click 'Get My Chat ID' →"
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                      />
                      <button
                        onClick={async () => {
                          const token = form?.telegramBotToken?.trim();
                          if (!token) { setTelegramTestResult("❌ Enter Bot Token first"); return; }
                          setTelegramTesting(true); setTelegramTestResult(null);
                          try {
                            const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
                            const json = await res.json();
                            if (!json.ok) { setTelegramTestResult(`❌ Token invalid: ${json.description}`); return; }
                            const updates = json.result ?? [];
                            if (updates.length === 0) {
                              setTelegramTestResult("⚠️ No messages found. Open Telegram → find your bot → send /start first");
                              return;
                            }
                            const chatId = String(updates[updates.length - 1]?.message?.chat?.id ?? "");
                            if (chatId) { set("telegramChatId", chatId); setTelegramTestResult(`✅ Chat ID found: ${chatId} — now Save Settings`); }
                            else setTelegramTestResult("❌ Could not find chat ID in updates");
                          } catch { setTelegramTestResult("❌ Network error"); }
                          finally { setTelegramTesting(false); }
                        }}
                        disabled={telegramTesting}
                        className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {telegramTesting ? "…" : "🔍 Get My Chat ID"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <button
                      onClick={testTelegram}
                      disabled={telegramTesting}
                      className="flex items-center gap-2 px-4 py-2 bg-[#229ED9] text-white text-sm font-semibold rounded-lg hover:bg-[#1a8fc0] disabled:opacity-50 transition-colors"
                    >
                      {telegramTesting ? "Sending…" : "📨 Test Telegram"}
                    </button>
                    {telegramTestResult && (
                      <p className="text-sm font-medium">{telegramTestResult}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">⚠️ Always Save Settings before testing.</p>
                </div>
              </SectionCard>

              {/* ── Browser Push ── */}
              <SectionCard title="Browser Push Notifications" icon={Bell}>
                <div className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Enable on This Device</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Receive a browser notification even when the admin tab is closed.
                      Works on Chrome, Edge, and Safari (macOS/iOS 16.4+).
                    </p>
                    {pushStatus === "on" && <p className="text-xs text-green-600 font-semibold mt-1">✅ Active on this device</p>}
                    {pushStatus === "off" && <p className="text-xs text-gray-400 mt-1">Not enabled on this device</p>}
                  </div>
                  <button
                    onClick={handlePushToggle}
                    disabled={pushStatus === "working" || pushStatus === "idle"}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      pushStatus === "on"
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-brand-500 text-white hover:bg-brand-600"
                    } disabled:opacity-50`}
                  >
                    {pushStatus === "working" ? "…" : pushStatus === "on" ? "Disable" : "Enable"}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Missed Order Phone Call Alert" icon={Phone}>
                <Toggle checked={form.notifyCallEnabled ?? false} onChange={v => set("notifyCallEnabled", v)}
                  label="Call Admin on Missed Order" description="If a new order isn't accepted within 60 seconds, automatically place a phone call to the number below (up to 3 attempts, 60s apart)" />
                <Field label="Admin Alert Phone Number" description="Where the automatic call is placed — e.g. (512) 555-0100">
                  <Input value={form.adminCallPhone ?? ""} onChange={v => set("adminCallPhone", formatPhoneUS(v))} type="text" placeholder="(512) 555-0100" />
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
                  <Input value={form.salesTaxPercent} onChange={v => set("salesTaxPercent", Number(v))} type="text" inputMode="decimal" prefix="%" />
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

