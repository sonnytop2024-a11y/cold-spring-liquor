"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Loader2, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // ── Flow 1: Request reset email ──────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setEmailSent(true);
      else { const d = await res.json(); setEmailError(d.error ?? "Something went wrong."); }
    } catch { setEmailError("Network error. Please try again."); }
    finally { setEmailLoading(false); }
  }

  // ── Flow 2: Set new password ─────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwDone, setPwDone] = useState(false);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (password !== confirm) { setPwError("Passwords do not match."); return; }
    if (password.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (res.ok) setPwDone(true);
      else setPwError(d.error ?? "Something went wrong.");
    } catch { setPwError("Network error. Please try again."); }
    finally { setPwLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto py-6 sm:py-12 px-3 sm:px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-5 sm:p-8">

        {token ? (
          pwDone ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="font-bold text-xl mb-2">Password Updated!</h2>
              <p className="text-gray-500 text-sm mb-6">You can now sign in with your new password.</p>
              <Link href="/auth/login"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors">
                Sign In →
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="font-heading text-xl sm:text-2xl font-bold">Set New Password</h1>
                <p className="text-gray-500 text-sm mt-1">Choose a strong password for your account</p>
              </div>
              {pwError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{pwError}</div>
              )}
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type={showPw ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type={showPw ? "text" : "password"} value={confirm}
                      onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${confirm && password !== confirm ? "border-red-400" : ""}`} />
                  </div>
                </div>
                <button type="submit" disabled={pwLoading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
                  {pwLoading ? <Loader2 size={18} className="animate-spin" /> : "Update Password"}
                </button>
              </form>
            </>
          )
        ) : (
          emailSent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="font-bold text-xl mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm mb-2">
                We sent a reset link to <strong>{email}</strong>.
              </p>
              <p className="text-gray-400 text-xs mb-6">Link expires in 30 minutes. Check your spam folder if needed.</p>
              <Link href="/auth/login" className="text-orange-500 hover:underline text-sm font-medium">
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="font-heading text-xl sm:text-2xl font-bold">Forgot Password?</h1>
                <p className="text-gray-500 text-sm mt-1">Enter your email and we&apos;ll send a reset link</p>
              </div>
              {emailError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{emailError}</div>
              )}
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type="email" value={email}
                      onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
                <button type="submit" disabled={emailLoading}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
                  {emailLoading ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Link"}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-5">
                Remember it?{" "}
                <Link href="/auth/login" className="text-orange-500 font-semibold hover:underline">Sign In</Link>
              </p>
            </>
          )
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
