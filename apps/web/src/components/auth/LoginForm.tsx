"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail, Lock, Loader2, Eye, EyeOff, Phone, MessageSquare,
  RefreshCw, User, Calendar, ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { formatPhoneUS, isValidPhoneUS } from "@/lib/phoneUtils";

type Tab = "email" | "phone" | "google";

function calcAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
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

// ── Phone tab — handles sign-in AND sign-up inline ────────────────────────────
function PhoneTab({ onSuccess }: { onSuccess: (user: any) => void }) {
  type Step = "phone" | "otp" | "register";
  const [step, setStep] = useState<Step>("phone");

  // Phone + OTP
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState(""); // E.164 after verify
  const [code, setCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Registration form
  const [reg, setReg] = useState({ name: "", dob: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  const age = calcAge(reg.dob);
  const isUnder21 = !!reg.dob && age < 21;

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhone(formatPhoneUS(e.target.value));
    setOtpError("");
  }

  async function sendOtp() {
    setOtpError(""); setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Failed to send code."); return; }
      setDevCode(data.devCode ?? "");
      setStep("otp");
      setResendCooldown(30);
      const t = setInterval(() => setResendCooldown(n => { if (n <= 1) { clearInterval(t); return 0; } return n - 1; }), 1000);
    } catch { setOtpError("Network error. Please try again."); }
    finally { setOtpLoading(false); }
  }

  async function verifyOtp() {
    setOtpError(""); setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error ?? "Invalid code.");
        return;
      }
      if (data.status === "login") {
        onSuccess(data.user);
      } else if (data.status === "needs_registration") {
        setVerifiedPhone(data.verifiedPhone ?? phone);
        setCode("");
        setStep("register");
      }
    } catch { setOtpError("Network error. Please try again."); }
    finally { setOtpLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    if (age < 21) { setRegError("You must be 21 or older to create an account."); return; }
    if (!ageConfirm) { setRegError("Please confirm you are 21 or older."); return; }
    if (reg.password.length < 8) { setRegError("Password must be at least 8 characters."); return; }
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reg.name,
          email: reg.email,
          phone: verifiedPhone || phone,
          dob: reg.dob,
          password: reg.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRegError(data.error ?? "Registration failed."); return; }
      window.location.href = "/?welcome=new";
    } catch { setRegError("Network error. Please try again."); }
    finally { setRegLoading(false); }
  }

  // ── Step: enter phone ───────────────────────────────────────────────────────
  if (step === "phone") {
    return (
      <div className="space-y-4">
        {otpError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{otpError}</div>}
        <div>
          <label className="block text-sm font-medium mb-1.5">Phone Number</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+1</span>
            <input type="tel" value={phone} onChange={handlePhoneChange}
              placeholder="(512) 555-0100" maxLength={14}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">We'll send a verification code to this number.</p>
        </div>
        <button
          onClick={sendOtp}
          disabled={otpLoading || !isValidPhoneUS(phone)}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {otpLoading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={16} />Send Verification Code</>}
        </button>
      </div>
    );
  }

  // ── Step: enter OTP ─────────────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <div className="space-y-4">
        {otpError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{otpError}</div>}

        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <p className="font-semibold">Code sent to {phone}</p>
          {devCode
            ? <p className="mt-1 text-xs text-amber-700">Dev mode — code: <code className="font-mono font-bold text-base tracking-widest">{devCode}</code></p>
            : <p className="mt-1 text-xs">Check your SMS for the 6-digit verification code.</p>
          }
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">6-Digit Code</label>
          <input
            type="text" inputMode="numeric" maxLength={6}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-3 border rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          onClick={verifyOtp} disabled={otpLoading || code.length < 6}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {otpLoading ? <Loader2 size={18} className="animate-spin" /> : "Verify Code"}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button onClick={() => { setStep("phone"); setCode(""); setOtpError(""); }} className="text-gray-500 hover:text-gray-700">
            ← Change number
          </button>
          <button
            onClick={sendOtp}
            disabled={resendCooldown > 0 || otpLoading}
            className="flex items-center gap-1 text-brand-600 hover:text-brand-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
          >
            <RefreshCw size={13} />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: registration form (phone already verified) ────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <ShieldCheck size={16} className="text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-green-800">Phone verified: {phone}</p>
          <p className="text-green-700 text-xs mt-0.5">Complete your profile to create your account.</p>
        </div>
      </div>

      {regError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{regError}</div>}

      <form onSubmit={handleRegister} className="space-y-3">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-medium mb-1">Full Legal Name *</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))}
              placeholder="As it appears on your ID"
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>

        {/* DOB */}
        <div>
          <label className="block text-xs font-medium mb-1">Date of Birth * (Must be 21+)</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required type="date" value={reg.dob}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split("T")[0]}
              onChange={e => setReg(r => ({ ...r, dob: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          {reg.dob && (
            <p className={`text-xs mt-1 font-medium ${isUnder21 ? "text-red-500" : "text-green-600"}`}>
              {isUnder21 ? `❌ Age ${age} — must be 21+` : `✓ Age verified: ${age}`}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium mb-1">Email Address *</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required type="email" value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium mb-1">Password * (min. 8 characters)</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input required type={showPw ? "text" : "password"} minLength={8}
              value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Age confirmation */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={ageConfirm} onChange={e => setAgeConfirm(e.target.checked)}
            className="mt-0.5 accent-brand-500" />
          <span className="text-xs text-gray-600">
            I confirm I am <strong>21 or older</strong> and agree to the Terms of Service. Valid ID required at delivery.
          </span>
        </label>

        <button
          type="submit"
          disabled={regLoading || isUnder21 || !ageConfirm}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
        >
          {regLoading ? <Loader2 size={18} className="animate-spin" /> : "Create Account & Sign In"}
        </button>
      </form>
    </div>
  );
}

// ── Google tab ────────────────────────────────────────────────────────────────
function GoogleTab({ onSuccess: _onSuccess }: { onSuccess: (user: any) => void }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">Sign in with your Google account</p>
      <button
        onClick={() => { setLoading(true); window.location.href = "/api/auth/google"; }}
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
    if (t && ["email", "phone", "google"].includes(t)) setTab(t);
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
    <div className="max-w-md mx-auto py-6 sm:py-12 px-3 sm:px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-8">
        <div className="text-center mb-5 sm:mb-7">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div style={{
              background: "radial-gradient(ellipse at 50% 40%, #1a1208 0%, #0d0d0d 55%, #050505 100%)",
              borderRadius: "16px",
              padding: "12px 16px 10px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,200,80,0.08)",
              display: "inline-block",
            }}>
              <Image
                src="/logo-full-transparent.png"
                alt="Cold Spring Liquor"
                width={200}
                height={217}
                className="w-[110px] sm:w-[160px] object-contain"
                priority
                style={{ imageRendering: "auto" }}
              />
            </div>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold">Sign In / Sign Up</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome to Cold Spring Liquor</p>
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
          New? Use <strong>Phone</strong> tab above to create an account with SMS verification.
        </p>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center">
          🔞 Must be 21+ to purchase alcohol. Valid ID required at delivery.
        </div>
      </div>
    </div>
  );
}
