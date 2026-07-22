"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Gift, Mail, User, MessageSquare, CreditCard, Check, Loader2, ArrowLeft, ShieldCheck, Martini, Sparkles } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const AMOUNTS = [25, 50, 100, 250];

interface BonusTier {
  id: string;
  minAmount: number;
  bonusAmount: number;
  expiryDays: number;
  active: boolean;
}

interface GiftCardBonus {
  code: string;
  amount: number;
  expiresAt?: string;
}

// Highest-value tier the amount clears — mirrors computeBonusTier() server-side.
// Purely for the "you'll get a bonus" preview banner; the server recomputes and
// creates the actual bonus card independently, so this can't be gamed.
function bonusForAmount(amount: number, tiers: BonusTier[]): BonusTier | null {
  const matches = tiers.filter((t) => amount >= t.minAmount);
  if (matches.length === 0) return null;
  return matches.reduce((best, t) => (t.minAmount > best.minAmount ? t : best));
}

const DESIGNS = [
  { id: "birthday", label: "Birthday", src: "/gift-cards/birthday.png" },
  { id: "thank-you", label: "Thank You", src: "/gift-cards/thank-you.png" },
  { id: "congratulations", label: "Congrats", src: "/gift-cards/congratulations.png" },
  { id: "anniversary", label: "Anniversary", src: "/gift-cards/anniversary.png" },
  { id: "love", label: "I Love You", src: "/gift-cards/love.png" },
] as const;

const inputCls =
  "w-full pl-9 pr-4 py-2.5 bg-[#0e0c09] border border-[#2a1f16] rounded-xl text-sm text-[#f2e9df] placeholder:text-[#6b5c4d] focus:outline-none focus:border-[#d4af6a] focus:ring-1 focus:ring-[#d4af6a]/30";

interface GiftCardFormData {
  amount: number;
  design: string;
  recipientEmail: string;
  senderName: string;
  senderEmail: string;
  message: string;
}

// ── Step 2: Stripe payment form ──────────────────────────────────────────────

function PaymentStep({
  data,
  clientSecret,
  bonus,
  onBack,
  onSuccess,
}: {
  data: GiftCardFormData;
  clientSecret: string;
  bonus: BonusTier | null;
  onBack: () => void;
  onSuccess: (code: string, paymentIntentId: string, bonus: GiftCardBonus | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const selectedDesign = DESIGNS.find((d) => d.id === data.design) ?? DESIGNS[0];

  async function handlePay() {
    if (!stripe || !elements) return;
    setError("");
    setPaying(true);

    const submitResult = await elements.submit();
    if (submitResult.error) {
      setError(submitResult.error.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    const pi = result.paymentIntent;
    if (pi?.status === "succeeded") {
      try {
        const res = await fetch("/api/gift-cards/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: pi.id,
            amount: data.amount,
            design: data.design,
            recipientEmail: data.recipientEmail,
            senderName: data.senderName,
            message: data.message,
            buyerEmail: data.senderEmail,
          }),
        });
        const json = await res.json();
        if (res.ok) {
          onSuccess(json.code, pi.id, json.bonus ?? null);
        } else {
          setError(json.error ?? "Failed to issue gift card");
        }
      } catch {
        setError("Network error. Please contact support with your payment ID.");
      }
    }

    setPaying(false);
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#a8907a] hover:text-[#f2e9df] mb-6 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Order summary */}
      <div className="bg-[#0e0c09] border border-[#2a1f16] rounded-2xl p-5 mb-6">
        <p className="text-xs text-[#a8907a] font-medium uppercase tracking-widest mb-3">Order Summary</p>
        <div className="flex gap-3 mb-4">
          <div className="relative w-24 aspect-[16/10] rounded-lg overflow-hidden shrink-0 border border-[#2a1f16]">
            <Image src={selectedDesign.src} alt={selectedDesign.label} fill sizes="96px" className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#e6dccf]">{selectedDesign.label} Gift Card</p>
            <p className="text-2xl font-heading font-bold text-[#f2d896] mt-0.5">${data.amount}.00</p>
          </div>
        </div>
        {bonus && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#2a2110] to-[#1c1608] border border-[#d4af6a]/40 rounded-xl px-3 py-2 mb-4">
            <Sparkles size={14} className="text-[#f2d896] shrink-0" />
            <p className="text-xs text-[#f2d896] font-semibold">
              + ${bonus.bonusAmount} Bonus Card included <span className="font-normal text-[#c9bcae]">— separate code, auto-applied</span>
            </p>
          </div>
        )}
        <div className="flex justify-between items-center text-xs text-[#a8907a] border-t border-[#2a1f16] pt-3">
          <span>To: {data.recipientEmail}</span>
          <span className="text-green-500 font-semibold">Email delivery — FREE</span>
        </div>
      </div>

      <h3 className="font-semibold text-sm text-[#e6dccf] mb-3">Payment Details</h3>
      <div className="border border-[#2a1f16] rounded-xl p-4 mb-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      <button
        onClick={handlePay}
        disabled={paying || !stripe}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#f2d896] to-[#c9973f] hover:brightness-105 disabled:bg-[#3a2c1e] disabled:from-[#3a2c1e] disabled:to-[#3a2c1e] disabled:text-[#7a6a58] text-[#1a1108] font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#d4af6a]/20"
      >
        {paying ? (
          <><Loader2 size={18} className="animate-spin" /> Processing…</>
        ) : (
          <><CreditCard size={18} /> Pay ${data.amount}.00 & Send Gift Card</>
        )}
      </button>

      <p className="text-xs text-center text-[#6b5c4d] mt-3">
        Secured by Stripe · Gift card delivered instantly after payment
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const initialData: GiftCardFormData = {
  amount: 50,
  design: DESIGNS[0].id,
  recipientEmail: "",
  senderName: "",
  senderEmail: "",
  message: "",
};

export function GiftCardStore() {
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [data, setData] = useState<GiftCardFormData>(initialData);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState("");
  const [successBonus, setSuccessBonus] = useState<GiftCardBonus | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>([]);

  useEffect(() => {
    fetch("/api/gift-cards/bonus-tiers")
      .then((r) => (r.ok ? r.json() : []))
      .then((tiers) => setBonusTiers(Array.isArray(tiers) ? tiers : []))
      .catch(() => {});
  }, []);

  const design = DESIGNS.find((d) => d.id === data.design) ?? DESIGNS[0];
  const bonus = bonusForAmount(data.amount || 0, bonusTiers);

  function selectAmount(amt: number) {
    setCustomOpen(false);
    setData((d) => ({ ...d, amount: amt }));
  }

  function setCustom(value: string) {
    setCustomAmount(value);
    const n = Number(value);
    if (n > 0) setData((d) => ({ ...d, amount: n }));
  }

  async function handleContinue() {
    if (!data.recipientEmail || !data.senderName || !data.amount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: data.amount }),
      });
      const json = await res.json();
      if (res.ok && json.clientSecret) {
        setClientSecret(json.clientSecret);
        setStep("payment");
      } else {
        alert("Could not initialize payment. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="bg-[#0a0806] py-24 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={40} className="text-green-400" />
          </div>
          <h2 className="font-heading text-3xl font-bold mb-2 text-[#f2d896]">Gift Card Sent! 🎁</h2>
          <p className="text-[#a8907a] mb-6">
            A <strong className="text-[#e6dccf]">${data.amount}</strong> gift card has been sent to <strong className="text-[#e6dccf]">{data.recipientEmail}</strong>.
          </p>
          <div className="bg-[#17110c] border border-[#3a2c1e] rounded-2xl px-6 py-4 inline-block mb-4">
            <p className="text-xs text-[#a8907a] mb-1 tracking-widest uppercase">Gift Card Code</p>
            <p className="text-2xl font-black text-[#f2d896] tracking-widest font-mono">{successCode}</p>
          </div>

          {successBonus && (
            <div className="bg-gradient-to-br from-[#2a2110] to-[#1c1608] border border-[#d4af6a]/50 rounded-2xl px-6 py-4 inline-block mb-6">
              <p className="text-xs text-[#f2d896] mb-1 tracking-widest uppercase flex items-center justify-center gap-1.5">
                <Sparkles size={12} /> ${successBonus.amount} Bonus Card
              </p>
              <p className="text-2xl font-black text-[#f2d896] tracking-widest font-mono">{successBonus.code}</p>
              <p className="text-[11px] text-[#c9bcae] mt-2">
                {successBonus.expiresAt
                  ? `Separate code — expires ${new Date(successBonus.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : "Separate code — no expiration"}
              </p>
            </div>
          )}
          <br />
          <button
            onClick={() => { setStep("form"); setSuccessCode(""); setSuccessBonus(null); setData(initialData); setCustomOpen(false); setCustomAmount(""); }}
            className="text-sm text-[#d4af6a] hover:underline"
          >
            Send another gift card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0806] text-[#f2e9df] pb-20">
      {/* ── Hero: bar photo backdrop ── */}
      <div className="relative overflow-hidden py-20 px-4 text-center">
        <Image src="/gift-cards/hero-bar.png" alt="" fill priority className="object-cover object-[center_65%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0806]/55 via-[#0a0806]/40 to-[#0a0806]" />
        <div className="relative">
          <div className="w-14 h-14 rounded-full border border-[#d4af6a] flex items-center justify-center mx-auto mb-5">
            <Gift size={24} className="text-[#d4af6a]" />
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#f2e0b0]">Digital Gift Cards</h1>
          <p className="text-[#a8907a] text-base mt-3 max-w-sm mx-auto">
            Give the gift of great drinks — delivered instantly via email.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="container-main grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        {/* LEFT: preview + design + amount */}
        <div>
          <div className="relative rounded-2xl overflow-hidden aspect-[16/9.4] shadow-2xl shadow-black/60 border border-[#d4af6a]/25 mb-8">
            <Image
              src={design.src}
              alt="Gift card design preview"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
              priority
            />
            <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-[#1a1108] text-sm font-bold px-3 py-1 rounded-full shadow-sm">
              ${data.amount || 0}
            </span>
          </div>

          <p className="text-xs font-bold tracking-[0.16em] text-[#a8907a] mb-3">CHOOSE A DESIGN</p>
          <div className="flex gap-3 overflow-x-auto pb-2 mb-8 -mx-1 px-1">
            {DESIGNS.map((d) => (
              <button
                key={d.id}
                onClick={() => setData((prev) => ({ ...prev, design: d.id }))}
                disabled={step === "payment"}
                title={d.label}
                className={`relative shrink-0 w-28 aspect-[16/10] rounded-lg overflow-hidden border-2 transition-all disabled:cursor-not-allowed ${
                  data.design === d.id ? "border-[#d4af6a] shadow-[0_0_0_3px_rgba(212,175,106,0.25)]" : "border-[#2a1f16] hover:border-[#5a4632]"
                }`}
              >
                <Image src={d.src} alt={d.label} fill sizes="112px" className="object-cover" />
              </button>
            ))}
          </div>

          <p className="text-xs font-bold tracking-[0.16em] text-[#a8907a] mb-3">SELECT AMOUNT</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {AMOUNTS.map((amt) => {
              const isSel = !customOpen && data.amount === amt;
              return (
                <button
                  key={amt}
                  onClick={() => selectAmount(amt)}
                  disabled={step === "payment"}
                  className={`py-5 rounded-2xl font-heading font-bold text-2xl border transition-all disabled:cursor-not-allowed ${
                    isSel
                      ? "bg-[#1c140b] border-[#d4af6a] text-[#f2d896] shadow-[0_0_0_3px_rgba(212,175,106,0.15)]"
                      : "bg-[#12100c] border-[#2a1f16] text-[#e6dccf] hover:border-[#5a4632]"
                  }`}
                >
                  ${amt}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCustomOpen((v) => !v)}
            disabled={step === "payment"}
            className={`w-full py-3 rounded-2xl text-sm font-bold border transition-colors disabled:cursor-not-allowed ${
              customOpen ? "bg-[#1c140b] border-[#d4af6a] text-[#f2d896]" : "border-dashed border-[#3a2c1e] text-[#a8907a] hover:border-[#5a4632]"
            }`}
          >
            {customOpen ? "Custom amount selected" : "+ Enter a custom amount"}
          </button>
          {customOpen && (
            <div className="flex items-center gap-2 mt-2 bg-[#0e0c09] border border-[#2a1f16] rounded-xl px-4 py-2.5">
              <span className="text-lg text-[#a8907a]">$</span>
              <input
                type="number"
                min={5}
                max={1000}
                value={customAmount}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Any amount"
                className="flex-1 bg-transparent outline-none text-[#f2e9df] font-heading text-lg"
              />
            </div>
          )}

          {bonus && (
            <div className="flex items-center gap-2.5 mt-3 bg-gradient-to-r from-[#2a2110] to-[#1c1608] border border-[#d4af6a]/40 rounded-xl px-4 py-3">
              <Sparkles size={16} className="text-[#f2d896] shrink-0" />
              <p className="text-sm text-[#f2d896] font-semibold">
                You&apos;ll also get a ${bonus.bonusAmount} Bonus Card!{" "}
                <span className="font-normal text-[#c9bcae]">— applied automatically, no code needed.</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-10">
            <TrustBadge icon={Mail} label="Instant Delivery" sub="via email" />
            <TrustBadge icon={ShieldCheck} label="Secure Payment" sub="100% safe" />
            <TrustBadge icon={Martini} label="Perfect For" sub="any occasion" />
          </div>
        </div>

        {/* RIGHT: form / payment */}
        <div className="bg-[#17110c] border border-[#3a2c1e] rounded-2xl p-6 lg:sticky lg:top-24">
          {step === "form" ? (
            <>
              <h2 className="font-heading font-bold text-xl text-[#f2d896] mb-5">Delivery Details</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-[#e6dccf]">Recipient&apos;s Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5c4d]" />
                  <input
                    type="email"
                    value={data.recipientEmail}
                    onChange={(e) => setData((d) => ({ ...d, recipientEmail: e.target.value }))}
                    placeholder="friend@example.com"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-[#e6dccf]">Your Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5c4d]" />
                  <input
                    value={data.senderName}
                    onChange={(e) => setData((d) => ({ ...d, senderName: e.target.value }))}
                    placeholder="From: Your Name"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-[#e6dccf]">Your Email <span className="text-[#6b5c4d]">(for your receipt)</span></label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b5c4d]" />
                  <input
                    type="email"
                    value={data.senderEmail}
                    onChange={(e) => setData((d) => ({ ...d, senderEmail: e.target.value }))}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-1 text-[#e6dccf]">Personal Message <span className="text-[#6b5c4d]">(optional)</span></label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3 top-3 text-[#6b5c4d]" />
                  <textarea
                    value={data.message}
                    onChange={(e) => setData((d) => ({ ...d, message: e.target.value }))}
                    rows={3}
                    placeholder="Enjoy your drinks! 🥂"
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              <div className="bg-[#0e0c09] border border-[#2a1f16] rounded-xl p-4 text-sm space-y-2 mb-5">
                <div className="flex justify-between">
                  <span className="text-[#a8907a]">Gift card amount</span>
                  <span className="font-bold text-[#e6dccf]">${(data.amount || 0).toFixed(2)}</span>
                </div>
                {bonus && (
                  <div className="flex justify-between">
                    <span className="text-[#c9bcae]">+ Bonus Card (auto-applied)</span>
                    <span className="font-semibold text-[#f2d896]">${bonus.bonusAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-green-500 font-semibold">
                  <span>🚚 Delivery (email)</span>
                  <span>FREE & Instant</span>
                </div>
                <div className="border-t border-[#2a1f16] pt-2 flex justify-between font-bold text-lg">
                  <span className="text-[#e6dccf]">Total</span>
                  <span className="text-[#f2d896]">${(data.amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={!data.recipientEmail || !data.senderName || !data.amount || loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#f2d896] to-[#c9973f] hover:brightness-105 disabled:bg-[#3a2c1e] disabled:from-[#3a2c1e] disabled:to-[#3a2c1e] disabled:text-[#7a6a58] text-[#1a1108] font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#d4af6a]/20"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Preparing…</> : <>Continue to Payment →</>}
              </button>

              <p className="text-xs text-center text-[#6b5c4d] mt-3">
                Gift cards are delivered instantly via email · Redeemable at checkout
                {bonus ? " · Bonus card is a separate, time-limited code" : " · Never expires"}
              </p>
            </>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: { colorPrimary: "#d4af6a", borderRadius: "12px", fontFamily: "inherit", colorBackground: "#0e0c09" },
                },
              }}
            >
              <PaymentStep
                data={data}
                clientSecret={clientSecret}
                bonus={bonus}
                onBack={() => setStep("form")}
                onSuccess={(code, _pid, bonusResult) => { setSuccessCode(code); setSuccessBonus(bonusResult); setStep("success"); }}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TrustBadge({ icon: Icon, label, sub }: { icon: typeof Mail; label: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="w-9 h-9 rounded-full border border-[#3a2c1e] flex items-center justify-center mx-auto mb-2">
        <Icon size={15} className="text-[#d4af6a]" />
      </div>
      <div className="text-[10.5px] font-bold text-[#e6dccf]">{label}</div>
      <div className="text-[9.5px] text-[#8a776b] mt-0.5">{sub}</div>
    </div>
  );
}
