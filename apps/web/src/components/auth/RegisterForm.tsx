"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock, Calendar, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

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
  const [form, setForm] = useState({
    name: "", email: "", phone: "", dob: "", password: "", confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const router = useRouter();

  const age = calcAge(form.dob);
  const isUnder21 = form.dob && age < 21;

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (age < 21) { setError("You must be 21 or older to create an account."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!ageConfirm) { setError("Please confirm that you are 21 or older."); return; }

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
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      setUser(data.user);
      router.push("/account");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-8">
        <div className="text-center mb-7">
          <h1 className="font-heading text-2xl font-bold">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Must be 21+ to register</p>
        </div>

        {/* Welcome bonus */}
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
          {/* Full Legal Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Legal Name *</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="As it appears on your ID"
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Date of Birth * (Must be 21+)</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="date"
                value={form.dob}
                onChange={(e) => set("dob", e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 21)).toISOString().split("T")[0]}
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {form.dob && (
              <p className={`text-xs mt-1 font-medium ${isUnder21 ? "text-red-500" : "text-green-600"}`}>
                {isUnder21
                  ? `❌ You are ${age} years old — must be 21+`
                  : `✓ Age verified: ${age} years old`}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone Number *</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(512) 555-0100"
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Email Address *</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                required
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm Password *</label>
            <input
              required
              type={showPw ? "text" : "password"}
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Re-enter password"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                form.confirm && form.password !== form.confirm ? "border-red-400" : ""
              }`}
            />
            {form.confirm && form.password !== form.confirm && (
              <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Age Confirmation */}
          <label className="flex items-start gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={ageConfirm}
              onChange={(e) => setAgeConfirm(e.target.checked)}
              className="mt-0.5 accent-brand-500"
            />
            <span className="text-sm text-gray-600">
              I confirm I am <strong>21 years of age or older</strong> and agree to the Terms of Service. I understand that a valid government-issued ID will be required upon delivery.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !!isUnder21 || !ageConfirm}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>

        <div className="mt-5 pt-5 border-t">
          <p className="text-center text-xs text-gray-400 mb-3">Or sign up / sign in with</p>
          <div className="flex gap-2">
            <Link href="/auth/login?tab=phone"
              className="flex-1 text-center text-xs font-semibold border rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
              📱 Phone OTP
            </Link>
            <Link href="/auth/login?tab=google"
              className="flex-1 text-center text-xs font-semibold border rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
              🔵 Google Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
