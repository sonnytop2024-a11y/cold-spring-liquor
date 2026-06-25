"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Check, Navigation, Phone, Package, MapPin, Clock, ChevronRight,
  LogIn, Loader2, Wifi, WifiOff, History, Bell,
  Star, CheckCircle, X, Camera, ShieldCheck, Pen, RotateCcw, AlertTriangle,
} from "lucide-react";

const queryClient = new QueryClient();

const DRIVER_ACTIONS: Record<string, { label: string; next: string; color: string }> = {
  pending:          { label: "Accept Order",         next: "confirmed",        color: "bg-blue-500 hover:bg-blue-600" },
  confirmed:        { label: "Head to Store",         next: "driver_assigned",  color: "bg-purple-500 hover:bg-purple-600" },
  preparing:        { label: "Order Ready — Pickup",  next: "driver_assigned",  color: "bg-purple-500 hover:bg-purple-600" },
  driver_assigned:  { label: "Arrived at Store",      next: "driver_at_store",  color: "bg-orange-500 hover:bg-orange-600" },
  driver_at_store:  { label: "Picked Up — En Route",  next: "out_for_delivery", color: "bg-brand-500 hover:bg-brand-600" },
  out_for_delivery: { label: "I'm Almost There",      next: "driver_arriving",  color: "bg-yellow-500 hover:bg-yellow-600" },
  driver_arriving:  { label: "I've Arrived",          next: "driver_arrived",   color: "bg-amber-500 hover:bg-amber-600" },
};

const FAIL_REASONS = [
  "Customer did not answer",
  "Customer not available after 5 minutes",
  "Customer failed 21+ ID verification",
  "Customer name does not match ID",
  "Customer refused to show ID",
  "Unsafe delivery location",
  "Other reason",
];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-blue-100 text-blue-700",
  driver_assigned: "bg-purple-100 text-purple-700",
  driver_at_store: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-brand-100 text-brand-700",
  driver_arriving: "bg-yellow-100 text-yellow-700",
  driver_arrived: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  failed_delivery: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "New Order", confirmed: "Confirmed", preparing: "Preparing",
  driver_assigned: "Heading to Store", driver_at_store: "At Store",
  out_for_delivery: "On the Way", driver_arriving: "Arriving Soon",
  driver_arrived: "Arrived",
  delivered: "Delivered", failed_delivery: "Failed",
};

const ACTIVE = ["pending","confirmed","preparing","driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived"];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Alert beeps via Web Audio API
function playAlertSound() {
  try {
    const ACtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!ACtx) return;
    const ctx = new ACtx();
    [0, 0.35, 0.7].forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.7, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.35);
    });
  } catch { /* browser may block autoplay — silently ignore */ }
}

async function updateStatus(orderId: string, status: string, extra?: Record<string, unknown>) {
  const r = await fetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...extra }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Status update failed (${r.status}): ${text.slice(0, 200)}`);
  }
  return r.json();
}

// ─── Real distance via Google Maps Distance Matrix API ───────────────────────
function useDriverDistance(
  driverLoc: { lat: number; lng: number } | null,
  deliveryAddress: any
) {
  const [miles, setMiles] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!driverLoc || !deliveryAddress || fetchedRef.current) return;
    const addressStr = [
      deliveryAddress.street,
      deliveryAddress.city,
      deliveryAddress.state,
      deliveryAddress.zip,
    ].filter(Boolean).join(", ");
    if (!addressStr.trim()) return;

    fetchedRef.current = true;
    setLoading(true);
    setUnavailable(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    // /distance lives outside /api/ so it bypasses the rewrite to the web app
    fetch(
      `/distance?olat=${driverLoc.lat}&olng=${driverLoc.lng}` +
      `&address=${encodeURIComponent(addressStr)}`,
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setUnavailable(true);
        } else {
          setMiles(data.miles);
          setMinutes(data.minutes);
        }
      })
      .catch(() => setUnavailable(true))
      .finally(() => { setLoading(false); clearTimeout(timeout); });
  }, [driverLoc?.lat, driverLoc?.lng, deliveryAddress]);

  return { miles, minutes, loading, unavailable };
}

// ─── New Order Alert Modal ────────────────────────────────────────────────────
function NewOrderAlert({
  order, driverId, driverLoc, onAccept, onDecline,
}: { order: any; driverId: string; driverLoc: { lat: number; lng: number } | null; onAccept: () => void; onDecline: () => void }) {
  const itemCount = order.items?.reduce((a: number, i: any) => a + i.quantity, 0) ?? 0;
  const [accepting, setAccepting] = useState(false);
  const { miles, minutes, loading, unavailable } = useDriverDistance(driverLoc, order.deliveryAddress);

  async function handleAccept() {
    setAccepting(true);
    await updateStatus(order.id, "confirmed", { driverId });
    onAccept();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border-4 border-brand-500 overflow-hidden">
        {/* Alert header */}
        <div className={`text-white px-5 py-4 ${order.deliveryType === "next-morning" ? "bg-amber-500" : "bg-brand-500"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/25 rounded-full flex items-center justify-center">
                <Bell size={20} className="animate-bounce" />
              </div>
              <div>
                <p className="font-black text-xl">
                  {order.deliveryType === "next-morning" ? "🌅 Morning Order" : "New Order!"}
                </p>
                <p className="text-white/80 text-sm">
                  {order.deliveryType === "next-morning" ? "Not urgent — next business morning" : `#${order.orderNumber}`}
                </p>
              </div>
            </div>
            <button onClick={onDecline} className="text-white/60 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Key metrics */}
        {unavailable ? (
          <div className="mx-4 mt-4 mb-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm font-semibold">
            <MapPin size={15} className="shrink-0" />
            Unable to calculate distance
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 pb-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <MapPin size={14} className="text-blue-600 mx-auto mb-0.5" />
              {loading || !driverLoc ? (
                <Loader2 size={18} className="text-blue-400 animate-spin mx-auto my-0.5" />
              ) : (
                <p className="font-black text-blue-700 text-xl">{miles}mi</p>
              )}
              <p className="text-[10px] text-blue-600 font-bold uppercase">From You</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <Clock size={14} className="text-orange-600 mx-auto mb-0.5" />
              {loading || !driverLoc ? (
                <Loader2 size={18} className="text-orange-400 animate-spin mx-auto my-0.5" />
              ) : (
                <p className="font-black text-orange-700 text-xl">{minutes}m</p>
              )}
              <p className="text-[10px] text-orange-600 font-bold uppercase">Drive Time</p>
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="px-4 pb-2 space-y-2">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Order Total</span>
              <span className="font-bold">${Number(order.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Items</span>
              <span className="font-bold">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
            </div>
            {order.deliveryAddress && (
              <div className="flex items-start gap-1.5 text-xs text-gray-500">
                <MapPin size={11} className="mt-0.5 shrink-0" />
                <span>{order.deliveryAddress.city}, {order.deliveryAddress.state}</span>
              </div>
            )}
          </div>

          {order.items?.length > 0 && (
            <div className="text-xs text-gray-500 space-y-0.5 px-1">
              {order.items.slice(0, 3).map((item: any, i: number) => (
                <div key={i}>🍶 {item.name} ×{item.quantity}</div>
              ))}
              {order.items.length > 3 && <div className="text-gray-400">+{order.items.length - 3} more items…</div>}
            </div>
          )}

          {order.customerNotes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 text-xs text-yellow-800">
              📝 <strong>Note: </strong>{order.customerNotes}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-5 pt-3 flex gap-3">
          <button onClick={onDecline}
            className="flex-1 border-2 rounded-xl py-3.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Decline
          </button>
          <button onClick={handleAccept} disabled={accepting}
            className="flex-[2] flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black py-3.5 rounded-xl text-sm transition-colors">
            {accepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {accepting ? "Accepting…" : "Accept Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Wait Timer (full card) ───────────────────────────────────────────────────
function WaitCountdown({ waitTimerStart, limitMinutes = 5 }: { waitTimerStart: string; limitMinutes?: number }) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(waitTimerStart).getTime()) / 1000);
      setRemaining(Math.max(0, limitMinutes * 60 - elapsed));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [waitTimerStart, limitMinutes]);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const expired = remaining === 0;
  return (
    <div className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${expired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
      {expired
        ? "⏰ Wait time expired — complete verification or report failed"
        : `⏳ Waiting for customer: ${mins}:${secs.toString().padStart(2, "0")}`}
    </div>
  );
}

// ─── Wait Timer (compact badge) ───────────────────────────────────────────────
function WaitCountdownBadge({ waitTimerStart, limitMinutes = 5 }: { waitTimerStart: string; limitMinutes?: number }) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    const calc = () => {
      const elapsed = Math.floor((Date.now() - new Date(waitTimerStart).getTime()) / 1000);
      setRemaining(Math.max(0, limitMinutes * 60 - elapsed));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [waitTimerStart, limitMinutes]);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const expired = remaining === 0;
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full font-mono ${expired ? "bg-red-200 text-red-800" : "bg-white/20 text-white"}`}>
      {expired ? "⏰ Expired" : `⏳ ${mins}:${secs.toString().padStart(2, "0")}`}
    </span>
  );
}

// ─── Delivery Verification Modal ──────────────────────────────────────────────
function DeliveryVerificationModal({
  order,
  waitTimerStart,
  onComplete,
  onFailed,
  onClose,
}: {
  order: any;
  waitTimerStart: string | null;
  onComplete: (data: {
    signatureUrl: string;
    deliveryProof: string;
    deliveryConfirmations: {
      ageVerified: boolean;
      idChecked: boolean;
      nameMatched: boolean;
      handedToCustomer: boolean;
      customerDob: string;
      customerAge: number;
    };
  }) => Promise<void>;
  onFailed: (reason: string, confirmations: {
    ageVerified: boolean;
    idChecked: boolean;
    nameMatched: boolean;
    handedToCustomer: boolean;
    customerDob: string;
    customerAge: number;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: currentYear - 1920 - 20 },
    (_, i) => currentYear - 21 - i
  );

  // ── Section A: DOB ─────────────────────────────────────────────────────────
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");

  const dob = dobYear && dobMonth && dobDay
    ? `${dobYear}-${dobMonth.padStart(2, "0")}-${dobDay.padStart(2, "0")}`
    : "";
  const age = dob ? calcAge(dob) : null;
  const dobEntered = !!(dobYear && dobMonth && dobDay);
  const ageOk = age !== null && age >= 21;

  // ── Section B: Checkboxes ──────────────────────────────────────────────────
  const [check21, setCheck21] = useState(false);
  const [checkId, setCheckId] = useState(false);
  const [checkName, setCheckName] = useState(false);
  const [checkHanded, setCheckHanded] = useState(false);
  const checksOk = check21 && checkId && checkName && checkHanded;

  // ── Section C: Signature ───────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sigDrawing, setSigDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getSigPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startSigDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getSigPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setSigDrawing(true);
    setHasStrokes(true);
    setSignatureData(null);
  }

  function sigDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!sigDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getSigPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function endSigDraw() { setSigDrawing(false); }

  function clearSig() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    setSignatureData(null);
  }

  function saveSignature() {
    if (!hasStrokes) return;
    setSignatureData(canvasRef.current!.toDataURL("image/png"));
  }

  // ── Section D: Proof photo ─────────────────────────────────────────────────
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      // Compress to max 800px wide, JPEG 60% — camera photos can be 5MB+ raw
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setProofPhoto(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  // ── Complete / Fail ────────────────────────────────────────────────────────
  const [showFail, setShowFail] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allDone = ageOk && checksOk && !!signatureData && !!proofPhoto;

  const buildConfirmations = () => ({
    ageVerified: check21,
    idChecked: checkId,
    nameMatched: checkName,
    handedToCustomer: checkHanded,
    customerDob: dob,
    customerAge: age ?? 0,
  });

  async function handleComplete() {
    if (!allDone || !signatureData || !proofPhoto) return;
    setSubmitting(true);
    await onComplete({
      signatureUrl: signatureData,
      deliveryProof: proofPhoto,
      deliveryConfirmations: buildConfirmations(),
    });
    setSubmitting(false);
  }

  async function handleFail() {
    if (!failReason) return;
    setSubmitting(true);
    await onFailed(failReason, buildConfirmations());
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
      {/* Sticky header */}
      <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div>
          <p className="font-black text-base leading-tight">Delivery Verification</p>
          <p className="text-white/80 text-xs">Order #{order.orderNumber} · {order.customerName}</p>
        </div>
        <div className="flex items-center gap-3">
          {waitTimerStart && <WaitCountdownBadge waitTimerStart={waitTimerStart} />}
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-48">

        {/* ── A: DOB & Age Verification ───────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 p-4 ${ageOk ? "border-green-400" : dobEntered && !ageOk ? "border-red-400" : "border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white ${ageOk ? "bg-green-500" : dobEntered && !ageOk ? "bg-red-500" : "bg-gray-400"}`}>
              {ageOk ? "✓" : "A"}
            </div>
            <div>
              <p className="font-bold text-sm">Customer Age Verification</p>
              <p className="text-xs text-gray-500">Enter date of birth from customer's government-issued ID</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
            <p className="text-xs font-semibold text-amber-800">
              ⚠️ Texas Law requires ID verification for ALL alcohol deliveries. You must check a valid government-issued photo ID.
            </p>
          </div>

          <p className="text-xs font-medium text-gray-700 mb-2">
            Customer: <strong>{order.customerName}</strong>
          </p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Month</label>
              <select value={dobMonth} onChange={e => setDobMonth(e.target.value)}
                className="w-full border rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Day</label>
              <select value={dobDay} onChange={e => setDobDay(e.target.value)}
                className="w-full border rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Year</label>
              <select value={dobYear} onChange={e => setDobYear(e.target.value)}
                className="w-full border rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Year</option>
                {yearOptions.map(y => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {dobEntered && (
            <div className={`rounded-xl px-4 py-3 text-sm font-bold ${ageOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {ageOk
                ? `✓ Age: ${age} years old — OK to deliver`
                : `❌ Age: ${age} years old — UNDER 21. You must refuse this delivery.`}
            </div>
          )}
        </div>

        {/* ── B: ID Confirmation Checkboxes ───────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 p-4 ${checksOk ? "border-green-400" : "border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white ${checksOk ? "bg-green-500" : "bg-gray-400"}`}>
              {checksOk ? "✓" : "B"}
            </div>
            <div>
              <p className="font-bold text-sm">ID Confirmation</p>
              <p className="text-xs text-gray-500">Required — check all boxes</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { state: check21, set: setCheck21, label: "I verified the customer is 21 or older" },
              { state: checkId, set: setCheckId, label: "I physically checked a valid government-issued photo ID (Driver's License, Passport, or State ID)" },
              { state: checkName, set: setCheckName, label: "The name on the ID matches the customer name on the order" },
              { state: checkHanded, set: setCheckHanded, label: "I handed the order directly to the ID-verified customer in person" },
            ].map(({ state, set, label }) => (
              <label key={label} onClick={() => set(!state)}
                className={`flex items-start gap-3 cursor-pointer rounded-xl px-3 py-3 border text-xs font-medium transition-colors select-none ${
                  state ? "bg-green-50 border-green-300 text-green-800" : "bg-gray-50 border-gray-200 text-gray-700"
                }`}>
                <div className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                  state ? "bg-green-500 border-green-500" : "border-gray-300 bg-white"
                }`}>
                  {state && <Check size={11} className="text-white" />}
                </div>
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* ── C: Customer Signature ────────────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 p-4 ${signatureData ? "border-green-400" : "border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white ${signatureData ? "bg-green-500" : "bg-gray-400"}`}>
              {signatureData ? "✓" : "C"}
            </div>
            <div>
              <p className="font-bold text-sm flex items-center gap-1.5"><Pen size={13} /> Customer Signature</p>
              <p className="text-xs text-gray-500">Have customer sign below, then tap "Save Signature"</p>
            </div>
          </div>

          {signatureData ? (
            <div className="space-y-2">
              <div className="border rounded-xl overflow-hidden bg-gray-50 p-2">
                <img src={signatureData} alt="Customer signature" className="w-full h-24 object-contain" />
              </div>
              <p className="text-xs text-green-600 font-semibold">✓ Signature saved</p>
              <button onClick={() => { setSignatureData(null); clearSig(); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline">
                Re-capture signature
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={140}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startSigDraw}
                  onMouseMove={sigDraw}
                  onMouseUp={endSigDraw}
                  onMouseLeave={endSigDraw}
                  onTouchStart={startSigDraw}
                  onTouchMove={sigDraw}
                  onTouchEnd={endSigDraw}
                />
              </div>
              {!hasStrokes && (
                <p className="text-xs text-gray-400 text-center">Ask customer to sign above with finger or stylus</p>
              )}
              <div className="flex gap-2">
                <button onClick={clearSig}
                  className="flex items-center gap-1.5 border rounded-xl py-2 px-3 text-sm text-gray-500 hover:bg-gray-50">
                  <RotateCcw size={13} /> Clear
                </button>
                <button onClick={saveSignature} disabled={!hasStrokes}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-xl py-2 text-sm font-semibold">
                  <Check size={14} /> Save Signature
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── D: Proof of Delivery Photo ───────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 p-4 ${proofPhoto ? "border-green-400" : "border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white ${proofPhoto ? "bg-green-500" : "bg-gray-400"}`}>
              {proofPhoto ? "✓" : "D"}
            </div>
            <div>
              <p className="font-bold text-sm flex items-center gap-1.5"><Camera size={13} /> Proof of Delivery Photo</p>
              <p className="text-xs text-gray-500">Take a photo of the delivered order at the door</p>
            </div>
          </div>

          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {proofPhoto ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden border bg-gray-50">
                <img src={proofPhoto} alt="Delivery proof" className="w-full h-44 object-cover rounded-xl" />
              </div>
              <p className="text-xs text-green-600 font-semibold">✓ Photo saved</p>
              <button onClick={() => setProofPhoto(null)}
                className="text-xs text-gray-500 hover:text-gray-700 underline">
                Retake photo
              </button>
            </div>
          ) : (
            <button onClick={() => photoRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-10 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors">
              <Camera size={32} />
              <span className="text-sm font-semibold">Tap to Take Photo</span>
              <span className="text-xs">Photo of delivered order at the door — required</span>
            </button>
          )}
        </div>

        {/* Progress checklist */}
        {!allDone && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-800 mb-2">Still required:</p>
            <ul className="text-xs text-amber-700 space-y-1">
              {!dobEntered && <li>• A — Enter customer date of birth</li>}
              {dobEntered && !ageOk && <li className="text-red-600 font-semibold">• A — Customer is under 21 — cannot complete delivery</li>}
              {!checksOk && <li>• B — Check all 4 ID confirmation boxes</li>}
              {!signatureData && <li>• C — Save customer signature</li>}
              {!proofPhoto && <li>• D — Take proof of delivery photo</li>}
            </ul>
          </div>
        )}

      </div>

      {/* ── Fixed bottom action bar ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t shadow-lg px-4 py-4 space-y-2">
        {!showFail ? (
          <>
            <button
              onClick={handleComplete}
              disabled={!allDone || submitting}
              className={`w-full flex items-center justify-center gap-2 font-black py-4 rounded-xl text-base transition-colors ${
                allDone
                  ? "bg-green-500 hover:bg-green-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting
                ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5" />
                : <><ShieldCheck size={20} /> Complete Delivery</>}
            </button>
            <button
              onClick={() => setShowFail(true)}
              className="w-full border border-red-300 text-red-600 font-semibold py-3 rounded-xl text-sm hover:bg-red-50 transition-colors"
            >
              ✕ Report Failed Delivery
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-700">Select reason for failed delivery:</p>
            </div>
            <select
              value={failReason}
              onChange={e => setFailReason(e.target.value)}
              className="w-full border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">Choose a reason…</option>
              {FAIL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowFail(false); setFailReason(""); }}
                className="flex-1 border rounded-xl py-3 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFail}
                disabled={!failReason || submitting}
                className={`flex-1 text-white font-semibold py-3 rounded-xl text-sm transition-colors ${
                  failReason && !submitting ? "bg-red-500 hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {submitting ? "Submitting…" : "Confirm Failed"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, driverId, driverLoc, onRefresh }: { order: any; driverId: string; driverLoc: { lat: number; lng: number } | null; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showVerification, setShowVerification] = useState(
    order.status === "driver_arrived"
  );

  // Auto-open verification modal whenever order is at driver_arrived
  useEffect(() => {
    if (order.status === "driver_arrived") {
      setShowVerification(true);
    }
  }, [order.status]);

  const action = DRIVER_ACTIONS[order.status];
  const address = order.deliveryAddress
    ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zip}`
    : "Address unavailable";
  const itemCount = order.items?.reduce((a: number, i: any) => a + i.quantity, 0) ?? 0;
  const { miles, minutes, loading: distLoading, unavailable: distUnavailable } = useDriverDistance(driverLoc, order.deliveryAddress);
  const isAssigned = ["driver_assigned","driver_at_store","out_for_delivery","driver_arriving","driver_arrived"].includes(order.status);
  const isArrived = order.status === "driver_arrived";

  async function doAction() {
    if (!action) return;
    // "I've Arrived" → set driver_arrived + immediately open verification modal
    if (action.next === "driver_arrived") {
      setLoading(true);
      await updateStatus(order.id, "driver_arrived");
      setLoading(false);
      setShowVerification(true); // open BEFORE refresh so state isn't lost on remount
      onRefresh();
      return;
    }
    setLoading(true);
    const extra = action.next === "confirmed" ? { driverId } : {};
    await updateStatus(order.id, action.next, extra);
    setLoading(false);
    onRefresh();
  }

  async function handleVerificationComplete(data: {
    signatureUrl: string;
    deliveryProof: string;
    deliveryConfirmations: {
      ageVerified: boolean;
      idChecked: boolean;
      nameMatched: boolean;
      handedToCustomer: boolean;
      customerDob: string;
      customerAge: number;
    };
  }) {
    setShowVerification(false);
    setLoading(true);
    try {
      await updateStatus(order.id, "delivered", {
        ageVerified: true,
        signatureUrl: data.signatureUrl,
        deliveryProof: data.deliveryProof,
        deliveryConfirmations: data.deliveryConfirmations,
      });
    } catch (err) {
      alert(`Failed to save delivery: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`);
      setLoading(false);
      setShowVerification(true);
      return;
    }
    setLoading(false);
    onRefresh();
  }

  async function handleVerificationFailed(
    reason: string,
    confirmations: { ageVerified: boolean; idChecked: boolean; nameMatched: boolean; handedToCustomer: boolean; customerDob: string; customerAge: number }
  ) {
    setShowVerification(false);
    setLoading(true);
    await updateStatus(order.id, "failed_delivery", {
      failReason: reason,
      ageVerified: false,
      deliveryConfirmations: confirmations,
    });
    setLoading(false);
    onRefresh();
  }

  return (
    <>
      <div className={`bg-white rounded-xl border shadow-sm mb-3 overflow-hidden ${
        isArrived ? "border-amber-400 ring-2 ring-amber-200" :
        order.status === "driver_arriving" ? "border-yellow-400 ring-2 ring-yellow-200" : ""
      }`}>
        {/* Header row */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}>
          <div>
            <p className="font-bold text-sm">#{order.orderNumber}</p>
            <p className="text-xs text-gray-500">{order.customerName}</p>
            {order.deliveryType === "next-morning" ? (
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                🌅 Next Morning — Not Urgent
              </span>
            ) : (
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                ⚡ Same-Day
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] ?? ""}`}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <p className="font-bold text-sm">${Number(order.total).toFixed(2)}</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="px-4 pb-2 flex items-center gap-2.5 text-xs text-gray-500">
          {distUnavailable ? (
            <span className="text-red-500 font-medium">Unable to calculate distance</span>
          ) : distLoading || !driverLoc ? (
            <span className="text-gray-400 italic flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Calculating…
            </span>
          ) : miles !== null ? (
            <>
              <span className="font-medium text-gray-700">{miles} mi from you</span>
              <span className="text-gray-300">·</span>
              <span>~{minutes} min</span>
            </>
          ) : null}
          {itemCount > 0 && <>
            <span className="text-gray-300">·</span>
            <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
          </>}
        </div>

        {/* Address */}
        <div className="px-4 pb-2 flex items-start gap-2">
          <MapPin size={13} className="mt-0.5 text-brand-500 shrink-0" />
          <span className="text-xs text-gray-600 leading-tight">{address}</span>
        </div>

        {/* Customer notes */}
        {order.customerNotes && (
          <div className="mx-4 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
            📝 <strong>Note: </strong>{order.customerNotes}
          </div>
        )}

        {/* Expanded: items */}
        {expanded && order.items?.length > 0 && (
          <div className="mx-4 mb-2 bg-gray-50 rounded-lg p-2.5 space-y-1">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-xs text-gray-600">
                <span>🍷 {item.name} ×{item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-1 mt-1 flex justify-between text-xs font-bold text-gray-800">
              <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Arriving banner */}
        {order.status === "driver_arriving" && (
          <div className="mx-4 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
            ⚠️ <strong>Almost there</strong> — Tap "I've Arrived" when you reach the customer's address
          </div>
        )}

        {/* Arrived: wait timer + verification prompt */}
        {isArrived && (
          <div className="mx-4 mb-3 space-y-2">
            {order.waitTimerStart && (
              <WaitCountdown waitTimerStart={order.waitTimerStart} />
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
              <p className="font-bold mb-1">🔔 You've arrived at the delivery location</p>
              <p>Complete all required verification steps before marking this order as delivered.</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pb-4 flex gap-2 flex-wrap">
          {isAssigned && (
            <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, "_blank")}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-3 rounded-lg text-xs">
              <Navigation size={13} /> Navigate
            </button>
          )}
          {order.customerPhone && ["out_for_delivery","driver_arriving","driver_arrived"].includes(order.status) && (
            <a href={`tel:${order.customerPhone}`}
              className="flex items-center gap-1.5 border text-gray-700 hover:bg-gray-50 font-semibold py-2.5 px-3 rounded-lg text-xs">
              <Phone size={13} /> Call
            </a>
          )}

          {/* Normal action button (not for driver_arrived) */}
          {action && !isArrived && (
            <button onClick={doAction} disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors ${action.color} ${loading ? "opacity-60" : ""}`}>
              {loading
                ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                : <><ChevronRight size={15} />{action.label}</>}
            </button>
          )}

          {/* Arrived: open verification flow */}
          {isArrived && (
            <button
              onClick={() => setShowVerification(true)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md"
            >
              {loading
                ? <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                : <><ShieldCheck size={16} /> Begin Delivery Verification</>}
            </button>
          )}

          {order.status === "delivered" && (
            <div className="flex-1 flex items-center justify-center gap-2 bg-green-100 text-green-700 font-semibold py-2.5 rounded-lg text-sm">
              <Check size={15} /> Delivered ✓
            </div>
          )}
        </div>
      </div>

      {showVerification && (
        <DeliveryVerificationModal
          order={order}
          waitTimerStart={order.waitTimerStart ?? null}
          onComplete={handleVerificationComplete}
          onFailed={handleVerificationFailed}
          onClose={() => setShowVerification(false)}
        />
      )}
    </>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function DriverLogin({ onLogin }: { onLogin: (driver: { id: string; name: string }) => void }) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/driver/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Login failed"); return; }
      onLogin({ id: data.driver.id, name: data.driver.name });
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xs mx-auto pt-16 px-4">
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="font-bold text-xl">Driver Login</h1>
          <p className="text-gray-500 text-sm">Cold Spring Liquor Driver Portal</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. marcus"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">4-Digit PIN</label>
            <input required type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 tracking-widest" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 text-center space-y-0.5">
          <p className="font-semibold">Default PINs:</p>
          <p>marcus → 1234 · sarah → 5678 · james → 9012</p>
        </div>
      </div>
    </div>
  );
}

// ─── GPS Poster ───────────────────────────────────────────────────────────────
function useGPSPosting(
  driverId: string | null,
  isOnline: boolean,
  onLocation?: (lat: number, lng: number) => void
) {
  const onLocationRef = useRef(onLocation);
  onLocationRef.current = onLocation;
  const watchIdRef = useRef<number | null>(null);
  const postIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestLocRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!driverId || !isOnline || !navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (postIntervalRef.current) {
        clearInterval(postIntervalRef.current);
        postIntervalRef.current = null;
      }
      return;
    }

    // watchPosition gives real-time continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        latestLocRef.current = { lat, lng };
        onLocationRef.current?.(lat, lng);
        fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId, lat, lng }),
        }).catch(() => {});
      },
      () => { /* GPS unavailable — leave driverLoc null, show "…" not fake data */ },
      { timeout: 10000, maximumAge: 5000, enableHighAccuracy: true }
    );

    // Heartbeat: re-post last known location every 8s to keep server up to date
    postIntervalRef.current = setInterval(() => {
      const loc = latestLocRef.current;
      if (!loc) return;
      fetch("/api/driver/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, lat: loc.lat, lng: loc.lng }),
      }).catch(() => {});
    }, 8_000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (postIntervalRef.current) {
        clearInterval(postIntervalRef.current);
        postIntervalRef.current = null;
      }
    };
  }, [driverId, isOnline]);
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ driverId }: { driverId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["driver-history", driverId],
    queryFn: async () => { const r = await fetch(`/api/driver/history?driverId=${driverId}`); return r.json(); },
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="text-center py-8 text-gray-400">
      <Loader2 size={20} className="animate-spin mx-auto mb-2" />
    </div>
  );

  const orders: any[] = data?.orders ?? [];
  const totalDeliveries = data?.total?.deliveries ?? data?.totalDeliveries ?? 0;
  const weekSales = Number(data?.week?.amount ?? data?.weekEarnings ?? 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="font-black text-2xl text-brand-600">{totalDeliveries}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <p className="font-black text-2xl text-gray-800">${weekSales.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sales This Week</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <History size={32} className="mx-auto mb-2 opacity-30" />
          <p className="font-semibold">No delivery history yet</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Recent Deliveries</p>
          {orders.map((order: any) => {
            const delivered = order.status === "delivered";
            return (
              <div key={order.id} className="bg-white rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">
                    {order.deliveryAddressMasked ?? order.customerName}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(order.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  {delivered && (
                    <p className="font-semibold text-sm">${Number(order.total).toFixed(2)}</p>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    delivered ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {delivered ? "✓ Done" : "Failed"}
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── GPS Required Gate ────────────────────────────────────────────────────────
function GPSRequiredScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <MapPin size={36} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-3">Location Required</h2>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed max-w-xs">
        This app requires your GPS location to calculate delivery distances. You cannot use the driver app without enabling location access.
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-left text-sm text-gray-700 mb-6 w-full max-w-xs space-y-2">
        <p className="font-bold text-gray-900 mb-1">How to enable:</p>
        <p>📱 <strong>iPhone:</strong> Settings → Privacy → Location Services → Safari → <em>While Using</em></p>
        <p>🤖 <strong>Android:</strong> Settings → Apps → Browser → Permissions → Location → Allow</p>
      </div>
      <button onClick={onRetry}
        className="w-full max-w-xs bg-brand-500 hover:bg-brand-600 text-white font-black py-4 rounded-2xl text-base transition-colors">
        I've Enabled Location — Retry
      </button>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function DashboardContent() {
  const [driver, setDriver] = useState<{ id: string; name: string } | null>(null);
  const [online, setOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [tab, setTab] = useState<"available" | "active" | "today" | "history">("available");
  const [alertOrder, setAlertOrder] = useState<any>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "checking" | "granted" | "denied">("idle");
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => {
    const saved = sessionStorage.getItem("csl-driver-session");
    if (saved) {
      try { setDriver(JSON.parse(saved)); } catch {}
    }
  }, []);

  useGPSPosting(driver?.id ?? null, online, (lat, lng) => setDriverLoc({ lat, lng }));

  // Request GPS immediately on login — block app if denied
  function requestGPS() {
    if (!driver) return;
    if (!navigator.geolocation) { setGpsStatus("denied"); return; }
    setGpsStatus("checking");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setDriverLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("granted");
      },
      () => setGpsStatus("denied"),
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  }

  useEffect(() => {
    if (driver) requestGPS();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

  function handleLogin(d: { id: string; name: string }) {
    sessionStorage.setItem("csl-driver-session", JSON.stringify(d));
    setDriver(d);
  }

  function handleLogout() {
    sessionStorage.removeItem("csl-driver-session");
    if (driver?.id && online) {
      fetch(`/api/admin/drivers/${driver.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: false }),
      }).catch(() => {});
    }
    setDriver(null);
    setOnline(false);
  }

  async function toggleOnline() {
    if (!driver) return;
    setTogglingOnline(true);
    const next = !online;
    try {
      await fetch(`/api/admin/drivers/${driver.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: next }),
      });
      setOnline(next);
      if (next) setTab("available");
    } finally {
      setTogglingOnline(false);
    }
  }

  const { data, refetch } = useQuery({
    queryKey: ["driver-deliveries", driver?.id],
    queryFn: async () => {
      const url = driver?.id ? `/api/driver/deliveries?driverId=${driver.id}` : "/api/driver/deliveries";
      const r = await fetch(url);
      return r.json();
    },
    refetchInterval: online ? 5_000 : 30_000,
    enabled: !!driver,
  });

  const newOrders: any[] = (data?.newOrders ?? []).filter((o: any) => ACTIVE.includes(o.status));
  const myActive: any[] = (data?.activeOrders ?? []).filter((o: any) => ACTIVE.includes(o.status));
  const completedToday: any[] = data?.completedToday ?? [];
  const earnings = data?.earnings ?? { today: 0, week: 0, deliveries: 0 };

  // Detect new incoming orders and show alert
  useEffect(() => {
    if (!online || newOrders.length === 0) return;
    const currentIds = new Set(newOrders.map((o: any) => o.id as string));
    if (prevOrderIdsRef.current.size > 0) {
      for (const id of currentIds) {
        if (!prevOrderIdsRef.current.has(id) && !alertOrder) {
          const incoming = newOrders.find((o: any) => o.id === id);
          if (incoming) {
            setAlertOrder(incoming);
            playAlertSound();
            break;
          }
        }
      }
    }
    prevOrderIdsRef.current = currentIds;
  }, [newOrders, online]);

  if (!driver) return <DriverLogin onLogin={handleLogin} />;

  if (gpsStatus === "denied") return <GPSRequiredScreen onRetry={requestGPS} />;

  if (gpsStatus === "checking" || gpsStatus === "idle") return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4">
      <Loader2 size={36} className="text-brand-500 animate-spin" />
      <p className="text-gray-600 font-semibold">Getting your location…</p>
    </div>
  );

  const TABS: { key: "available" | "active" | "today" | "history"; label: string; count: number }[] = [
    { key: "available", label: "Available", count: online ? newOrders.length : 0 },
    { key: "active",    label: "Active",    count: myActive.length },
    { key: "today",     label: "Today",     count: completedToday.length },
    { key: "history",   label: "History",   count: 0 },
  ];

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-100 pb-10">
      {/* New Order Alert Overlay */}
      {alertOrder && (
        <NewOrderAlert
          order={alertOrder}
          driverId={driver.id}
          driverLoc={driverLoc}
          onAccept={() => {
            setAlertOrder(null);
            qc.invalidateQueries({ queryKey: ["driver-deliveries"] });
            setTab("active");
          }}
          onDecline={() => setAlertOrder(null)}
        />
      )}

      {/* Sticky Header */}
      <header className="bg-gray-900 text-white px-4 pt-4 pb-3 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
              CSL
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{driver.name}</p>
              <p className="text-gray-400 text-[10px]">Cold Spring Liquor · Driver</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleOnline} disabled={togglingOnline}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                online
                  ? "bg-green-500 text-white shadow-lg shadow-green-900/30"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}>
              {togglingOnline ? <Loader2 size={11} className="animate-spin" /> : online ? <Wifi size={11} /> : <WifiOff size={11} />}
              {online ? "Online" : "Go Online"}
            </button>
            <button onClick={handleLogout}
              className="text-gray-500 hover:text-white text-[11px] transition-colors px-1.5 py-1">
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats row */}
        {online && (
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[
              { label: "Deliveries Today", value: String(earnings.deliveries) },
              { label: "Sales Today", value: `$${Number(earnings.today).toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800 rounded-lg py-2 text-center">
                <p className="font-black text-sm text-white">{value}</p>
                <p className="text-[10px] text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-0.5 bg-gray-800 rounded-xl p-1">
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                tab === key ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
              }`}>
              {label}
              {count > 0 && (
                <span className={`ml-1 text-[10px] font-black px-1 rounded-full ${
                  key === "available" ? "bg-brand-500 text-white" : "bg-gray-600 text-gray-200"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-3">

        {/* ── AVAILABLE TAB ── */}
        {tab === "available" && (
          !online ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <WifiOff size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="font-bold text-gray-700 mb-1">You are Offline</p>
              <p className="text-sm text-gray-400 mb-4">Go online to see and accept orders</p>
              <button onClick={toggleOnline}
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                Go Online
              </button>
            </div>
          ) : newOrders.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <Package size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No available orders</p>
              <p className="text-sm mt-1">Waiting for new orders…</p>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Watching for orders (auto-refresh 5s)
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                {newOrders.length} order{newOrders.length !== 1 ? "s" : ""} available
              </p>
              {newOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} driverId={driver.id} driverLoc={driverLoc} onRefresh={() => refetch()} />
              ))}
            </>
          )
        )}

        {/* ── ACTIVE TAB ── */}
        {tab === "active" && (
          myActive.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <CheckCircle size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No active deliveries</p>
              <p className="text-sm mt-1">Accept an order to start delivering</p>
              <button onClick={() => setTab("available")}
                className="mt-3 text-brand-500 text-sm font-semibold hover:underline">
                View available orders →
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                {myActive.length} active delivery
              </p>
              {myActive.map((order: any) => (
                <OrderCard key={order.id} order={order} driverId={driver.id} driverLoc={driverLoc} onRefresh={() => refetch()} />
              ))}
            </>
          )
        )}

        {/* ── TODAY TAB ── */}
        {tab === "today" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="font-black text-2xl text-brand-600">{completedToday.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Orders Today</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="font-black text-2xl text-gray-800">${Number(earnings.today).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Sales Today</p>
              </div>
            </div>

            {completedToday.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                <Star size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold">No deliveries today yet</p>
                <p className="text-sm mt-1">Complete orders to see them here</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Completed Today</p>
                {completedToday.map((order: any) => (
                  <div key={order.id} className="bg-white rounded-xl border p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order.customerName}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">${Number(order.total).toFixed(2)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                        ✓ Done
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && <HistoryTab driverId={driver.id} />}

        {/* GPS active indicator */}
        {online && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-green-700 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            GPS active — location shared with dispatch
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
