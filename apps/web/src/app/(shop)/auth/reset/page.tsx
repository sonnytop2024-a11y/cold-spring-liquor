"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Mock: just show success (real impl would send email via SendGrid/SES)
    await new Promise((r) => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-8">
        {sent ? (
          <div className="text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="font-bold text-xl mb-2">Check Your Email</h2>
            <p className="text-gray-500 text-sm mb-6">
              We sent a password reset link to <strong>{email}</strong>. It expires in 30 minutes.
            </p>
            <Link href="/auth/login" className="text-brand-600 hover:underline text-sm font-medium">
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <h1 className="font-heading text-2xl font-bold">Reset Password</h1>
              <p className="text-gray-500 text-sm mt-1">We&apos;ll send a reset link to your email</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Link"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Remember it?{" "}
              <Link href="/auth/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
