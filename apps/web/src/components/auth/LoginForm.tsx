"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, Eye, EyeOff, Phone, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type Tab = "email" | "phone" | "google";

// ── Google SVG icon ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6.1C12.4 13.1 17.8 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.5 2.9-2.2 5.3-4.6 6.9l7.2 5.6c4.2-3.9 6.6-9.6 6.6-16.5z"/>
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6L2.5 13.3A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l8-6.1z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.2-5.6c-2 1.4-4.6 2.1-8 2.1-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

// ── Email/Password tab ────────────────────────────────────────────────────────
function EmailTab({ onSuccess }: { onSuccess: (user: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed."); return; }
      onSuccess(data.user);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
      <div>
        <label className="block text-sm font-medium mb-1.5">Email Address</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1.5">
          <label className="text-sm font-medium">Password</label>
          <Link href="/auth/reset" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
        </div>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            className="w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
        {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
      </button>
    </form>
  );
}

// ── Phone OTP tab ─────────────────────────────────────────────────────────────
function PhoneTab({ onSuccess }: { onSuccess: (user: any) => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [mockOtp, setMockOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", phone }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send OTP"); return; }
      setMockOtp(data.mockOtp); // show in UI since no real SMS
      setStep("otp");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", phone, code }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid OTP"); return; }
      onSuccess(data.user);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

      {step === "phone" ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(512) 555-0100"
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <button onClick={sendOtp} disabled={loading || !phone}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={16} /> Send OTP</>}
          </button>
        </>
      ) : (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
            <p className="font-semibold">OTP sent to {phone}</p>
            <p className="mt-1 text-xs">Demo OTP (no SMS): <code className="font-mono font-bold text-lg tracking-widest">{mockOtp}</code></p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Enter 6-Digit Code</label>
            <input type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-4 py-3 border rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep("phone")} className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Back</button>
            <button onClick={verifyOtp} disabled={loading || code.length < 6}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Sign In"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Google tab ────────────────────────────────────────────────────────────────
function GoogleTab({ onSuccess: _onSuccess }: { onSuccess: (user: any) => void }) {
  const [loading, setLoading] = useState(false);

  function handleGoogleLogin() {
    setLoading(true);
    window.location.href = "/api/auth/google";
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">
        Sign in with your Google account
      </p>
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border-2 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors font-medium disabled:opacity-60"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
        {loading ? "Redirecting..." : "Continue with Google"}
      </button>
    </div>
  );
}

// ── Main LoginForm ─────────────────────────────────────────────────────────────
export function LoginForm() {
  const [tab, setTab] = useState<Tab>("email");
  const { setUser } = useAuthStore();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const t = params.get("tab") as Tab;
    if (t && ["email","phone","google"].includes(t)) setTab(t);
  }, [params]);

  function handleSuccess(user: any) {
    setUser(user);
    router.push("/account");
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "email", label: "Email", icon: <Mail size={14} /> },
    { id: "phone", label: "Phone", icon: <Phone size={14} /> },
    { id: "google", label: "Google", icon: <GoogleIcon /> },
  ];

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-8">
        <div className="text-center mb-7">
          <h1 className="font-heading text-2xl font-bold">Sign In</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back to Cold Spring Liquor</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "email" && <EmailTab onSuccess={handleSuccess} />}
        {tab === "phone" && <PhoneTab onSuccess={handleSuccess} />}
        {tab === "google" && <GoogleTab onSuccess={handleSuccess} />}

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-brand-600 font-semibold hover:underline">Create account</Link>
        </p>

        <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center">
          🔞 Must be 21+ to purchase alcohol. Valid ID required at delivery.
        </div>
      </div>
    </div>
  );
}
