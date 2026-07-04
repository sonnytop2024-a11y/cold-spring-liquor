"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, Mail, Lock, Calendar, Loader2, Eye, EyeOff, CheckCircle, MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { formatPhoneUS, isValidPhoneUS } from "@/lib/phoneUtils";

function calcAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function RegisterForm() {
  const params = useSearchParams();
  const googleId = params.get("googleId") ?? "";
  const isGoogleSignup = !!googleId;

  const [form, setForm] = useState({
    name: params.get("name") ?? "",
    email: params.get("email") ?? "",
    phone: formatPhoneUS(params.get("phone") ?? ""),
    dob: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  // Phone OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const age = calcAge(form.dob);
  const isUnder21 = !!form.dob && age < 21;

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneUS(e.target.value);
    set("phone", formatted);
    // Reset verification if phone changes
    if (phoneVerified || otpSent) {
      setPhoneVerified(false);
      setOtpSent(false);
      setOtpCode("");
      setOtpError("");
    }
  }

  async function sendPhoneOtp() {
    if (!isValidPhoneUS(form.phone)) { setOtpError("Enter a valid 10-digit US phone number."); return; }
    setOtpError(""); setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: form.phone }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Failed to send code"); return; }
      setDevCode(data.devCode ?? "");
      setOtpSent(true);
      setResendCooldown(30);
      const t = setInterval(() => setResendCooldown(n => { if (n <= 1) { clearInterval(t); return 0; } return n - 1; }), 1000);
    } catch { setOtpError("Network error."); }
    finally { setOtpLoading(false); }
  }

  async function verifyPhoneOtp() {
    if (otpCode.length < 6) { setOtpError("Enter the 6-digit code."); return; }
    setOtpError(""); setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-only", phone: form.phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error ?? "Invalid code."); return; }
      setPhoneVerified(true);
      setOtpSent(false);
    } catch { setOtpError("Network error."); }
    finally { setOtpLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (age < 21) { setError("You must be 21 or older to create an account."); return; }
    if (!isGoogleSignup && form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!ageConfirm) { setError("Please confirm that you are 21 or older."); return; }
    if (!isGoogleSignup && !phoneVerified) { setError("Please verify your phone number before creating your account."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          dob: form.dob,
          ...(isGoogleSignup ? { googleId } : { password: form.password }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      setUser(data.user);
      window.location.href = "/?welcome=new";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10 px-3 sm:px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-8">
        <div className="text-center mb-5 sm:mb-7">
          <h1 className="font-heading text-xl sm:text-2xl font-bold">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Must be 21+ to register</p>
        </div>

        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-xl mb-5">
          <CheckCircle size={16} />
          <span>Get <strong>50 CS Rewards Points</strong> when you create your account!</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Legal Name *</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="As it appears on your ID"
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Date of Birth * (Must be 21+)</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split("T")[0]}
                className="block w-full min-w-0 max-w-full appearance-none bg-white pl-9 pr-4 py-2.5 min-h-[42px] border rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{ WebkitAppearance: "none" }} />
            </div>
            {form.dob && (
              <p className={`text-xs mt-1 font-medium ${isUnder21 ? "text-red-500" : "text-green-600"}`}>
                {isUnder21 ? `❌ You are ${age} years old — must be 21+` : `✓ Age verified: ${age} years old`}
              </p>
            )}
          </div>

          {/* Phone + OTP verification (not for Google signup) */}
          {!isGoogleSignup && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone Number * <span className="text-gray-400 font-normal">(verification required)</span></label>

              {phoneVerified ? (
                <div className="flex items-center gap-2 border border-green-300 bg-green-50 rounded-xl px-3 py-2.5">
                  <ShieldCheck size={16} className="text-green-600 shrink-0" />
                  <span className="text-sm text-green-700 font-medium">{form.phone} — Verified ✓</span>
                  <button type="button" onClick={() => { setPhoneVerified(false); setOtpSent(false); setOtpCode(""); }}
                    className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+1</span>
                      <input
                        type="tel" value={form.phone} onChange={handlePhoneChange}
                        placeholder="(512) 555-0100" maxLength={14}
                        disabled={otpSent}
                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
                      />
                    </div>
                    {!otpSent && (
                      <button
                        type="button"
                        onClick={sendPhoneOtp}
                        disabled={otpLoading || !isValidPhoneUS(form.phone)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        {otpLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                        Send Code
                      </button>
                    )}
                  </div>

                  {otpError && <p className="text-red-500 text-xs mt-1">{otpError}</p>}

                  {otpSent && (
                    <div className="mt-2 space-y-2">
                      {devCode && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                          Dev mode — code: <code className="font-mono font-bold">{devCode}</code>
                        </p>
                      )}
                      {!devCode && (
                        <p className="text-xs text-green-700">Code sent to {form.phone}. Check your SMS.</p>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text" inputMode="numeric" maxLength={6}
                          value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 6-digit code"
                          className="flex-1 px-3 py-2.5 border rounded-xl text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={verifyPhoneOtp}
                          disabled={otpLoading || otpCode.length < 6}
                          className="shrink-0 px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          {otpLoading ? <Loader2 size={14} className="animate-spin" /> : "Verify"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={sendPhoneOtp}
                        disabled={resendCooldown > 0 || otpLoading}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 disabled:text-gray-400"
                      >
                        <RefreshCw size={11} />
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Email Address *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {/* Password */}
          {!isGoogleSignup && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Password *</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type={showPw ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)}
                  minLength={8} placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {!isGoogleSignup && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password *</label>
              <input required type={showPw ? "text" : "password"} value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
                placeholder="Re-enter password"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${form.confirm && form.password !== form.confirm ? "border-red-400" : ""}`} />
              {form.confirm && form.password !== form.confirm && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Age checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mt-2">
            <input type="checkbox" checked={ageConfirm} onChange={(e) => setAgeConfirm(e.target.checked)}
              className="mt-0.5 accent-brand-500" />
            <span className="text-sm text-gray-600">
              I confirm I am <strong>21 years of age or older</strong> and agree to the Terms of Service.
              I understand that a valid government-issued ID will be required upon delivery.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !!isUnder21 || !ageConfirm || (!isGoogleSignup && !phoneVerified)}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
          </button>

          {!isGoogleSignup && !phoneVerified && (
            <p className="text-center text-xs text-amber-600">
              📱 Verify your phone number above to enable account creation.
            </p>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>

        <div className="mt-5 pt-5 border-t">
          <p className="text-center text-xs text-gray-400 mb-3">Or sign up / sign in with</p>
          <Link href="/auth/login?tab=google"
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold border rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
            🔵 Continue with Google
          </Link>
        </div>
      </div>
    </div>
  );
}
