"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Edit, Trash2, X, Check, Truck, MapPin, Phone, Mail, User,
  ToggleLeft, ToggleRight, Package, Clock, Eye, Loader2, Shield, Star,
  ChevronRight, AlertCircle,
} from "lucide-react";
import { API } from "@/lib/api";

interface DriverOrder {
  id: string; orderNumber: string; status: string;
  customerName: string; customerPhone: string;
  deliveryAddress: { street: string; city: string; state: string; zip: string };
  items: Array<{ productId: string; name: string; price: number; quantity: number }>;
  subtotal: number; total: number; createdAt: string; updatedAt: string;
}
interface Driver {
  id: string; name: string; phone: string; email: string;
  username: string; pin: string;
  active: boolean; isOnline: boolean;
  lat: number | null; lng: number | null; locationUpdatedAt: string | null;
  currentOrder: DriverOrder | null;
  totalDeliveries: number; totalEarnings: number;
  todayDeliveries: number; todayEarnings: number;
  rating: number; createdAt: string;
  orders?: DriverOrder[];
}

const EMPTY_FORM = { name: "", phone: "", email: "", username: "", pin: "", active: true };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", preparing: "Preparing",
  driver_assigned: "Assigned", driver_at_store: "At Store",
  out_for_delivery: "On the Way", driver_arriving: "Arriving",
  delivered: "Delivered", failed_delivery: "Failed", cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  driver_assigned: "bg-indigo-100 text-indigo-700",
  driver_at_store: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  driver_arriving: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  failed_delivery: "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-gray-500",
};

// ─── Leaflet helpers ──────────────────────────────────────────────────────────
declare global { interface Window { L: any } }

function loadLeaflet(cb: (L: any) => void) {
  if (window.L) { cb(window.L); return; }
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[src*="leaflet"]')) {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => cb(window.L);
    document.head.appendChild(s);
  } else {
    const poll = setInterval(() => { if (window.L) { clearInterval(poll); cb(window.L); } }, 100);
  }
}

// ─── Add/Edit Driver Modal ────────────────────────────────────────────────────
function DriverModal({
  driver, onClose, onSave, saving, error,
}: {
  driver: Partial<Driver> | null;
  onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => void;
  saving: boolean; error: string;
}) {
  const isNew = !driver?.id;
  const [form, setForm] = useState<typeof EMPTY_FORM>({
    ...EMPTY_FORM,
    name: driver?.name ?? "",
    phone: driver?.phone ?? "",
    email: driver?.email ?? "",
    username: driver?.username ?? "",
    pin: driver?.pin ?? "",
    active: driver?.active ?? true,
  });
  const set = (k: keyof typeof EMPTY_FORM, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{isNew ? "Add New Driver" : "Edit Driver"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl">
              <AlertCircle size={14} />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Marcus Thompson"
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="5124441000"
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="driver@csl.com"
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Username *</label>
              <input required value={form.username} onChange={e => set("username", e.target.value)}
                placeholder="marcus"
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">4-Digit PIN *</label>
              <div className="relative">
                <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required maxLength={4} value={form.pin}
                  onChange={e => set("pin", e.target.value.replace(/\D/g, ""))}
                  placeholder="1234"
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Used to log in to Driver App</p>
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button type="button" onClick={() => set("active", !form.active)}
              className={`transition-colors ${form.active ? "text-green-500" : "text-gray-300"}`}>
              {form.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
            <span className="text-sm font-medium">Active — can log in to Driver App</span>
          </label>
          <div className="flex gap-2 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {isNew ? "Add Driver" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ─── Driver Detail Slide-Over ────────────────────────────────────────────────
function DriverDetailPanel({
  driverId, onClose, onEdit,
}: { driverId: string; onClose: () => void; onEdit: (d: Driver) => void }) {
  const mapRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  const { data: driver, isLoading } = useQuery<Driver>({
    queryKey: ["admin-driver-detail", driverId],
    queryFn: async () => {
      const r = await fetch(`${API}/admin/drivers/${driverId}`);
      return r.json();
    },
    refetchInterval: 6_000,
  });

  // Init detail map
  useEffect(() => {
    loadLeaflet(L => {
      const el = document.getElementById(`detail-map-${driverId}`);
      if (!el || mapRef.current) return;
      const map = L.map(el, { zoomControl: false, attributionControl: false }).setView([30.5786, -97.8536], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
      const storeIcon = L.divIcon({
        html: `<div style="width:24px;height:24px;background:#111;border:2px solid #ff6b1a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;">🏪</div>`,
        className: "", iconSize: [24, 24], iconAnchor: [12, 12],
      });
      L.marker([30.5786, -97.8536], { icon: storeIcon }).addTo(map);
      mapRef.current = map;
    });
  }, [driverId]);

  // Update driver marker
  useEffect(() => {
    if (!mapRef.current || !driver?.lat || !window.L) return;
    const L = window.L;
    const icon = L.divIcon({
      html: `<div style="width:40px;height:40px;background:${driver.isOnline ? "#22c55e" : "#6b7280"};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px rgba(0,0,0,.3);">🚗</div>`,
      className: "", iconSize: [40, 40], iconAnchor: [20, 20],
    });
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driver.lat, driver.lng]).setIcon(icon);
    } else {
      driverMarkerRef.current = L.marker([driver.lat, driver.lng], { icon })
        .bindPopup(`<b>${driver.name}</b>`).addTo(mapRef.current);
    }
    mapRef.current.panTo([driver.lat, driver.lng], { animate: true, duration: 0.8 });
  }, [driver?.lat, driver?.lng, driver?.isOnline]);

  const locationAge = driver?.locationUpdatedAt
    ? Math.round((Date.now() - new Date(driver.locationUpdatedAt).getTime()) / 1000)
    : null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base ${driver?.isOnline ? "bg-green-500" : "bg-gray-400"}`}>
              {driver?.name?.charAt(0) ?? "?"}
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">{driver?.name ?? "Loading..."}</h2>
              <p className={`text-xs flex items-center gap-1 font-medium ${driver?.isOnline ? "text-green-600" : "text-gray-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${driver?.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                {driver?.isOnline ? "Online — Đang hoạt động" : "Offline"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {driver && (
              <button onClick={() => onEdit(driver)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-50">
                <Edit size={12} /> Edit
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : !driver ? null : (
          <div className="p-5 space-y-5">

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Today", value: driver.todayDeliveries, sub: `${driver.todayDeliveries} orders`, icon: "📦" },
                { label: "Total Orders", value: driver.totalDeliveries ?? driver.todayDeliveries, sub: "completed", icon: "🚗" },
                { label: "Today Sales", value: `$${Number(driver.todayEarnings).toFixed(0)}`, sub: "order amount", icon: "💰" },
                { label: "Rating", value: driver.rating, sub: "⭐", icon: "🏅" },
              ].map(({ label, value, sub, icon }) => (
                <div key={label} className="bg-gray-50 border rounded-xl p-3 text-center">
                  <p className="text-xl mb-0.5">{icon}</p>
                  <p className="font-bold text-base leading-tight">{value}</p>
                  <p className="text-xs text-gray-500">{sub}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Contact + Credentials */}
            <div className="bg-gray-50 border rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Thông tin tài khoản</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><Phone size={13} className="text-gray-400 shrink-0" />{driver.phone || "—"}</div>
                <div className="flex items-center gap-2 text-gray-600"><Mail size={13} className="text-gray-400 shrink-0" />{driver.email || "—"}</div>
                <div className="flex items-center gap-2 text-gray-600"><User size={13} className="text-gray-400 shrink-0" />
                  <code className="bg-white border px-1.5 py-0.5 rounded text-xs font-mono">{driver.username}</code>
                </div>
                <div className="flex items-center gap-2 text-gray-600"><Shield size={13} className="text-gray-400 shrink-0" />
                  PIN: <code className="bg-white border px-1.5 py-0.5 rounded text-xs font-mono tracking-widest">{driver.pin}</code>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${driver.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {driver.active ? "✓ Active" : "✕ Deactivated"}
                </span>
              </div>
            </div>

            {/* Live Map */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-500" /> Vị trí hiện tại (Real-time)
                </p>
                {locationAge !== null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${locationAge < 30 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {locationAge < 5 ? "Vừa cập nhật" : `${locationAge}s trước`}
                  </span>
                )}
              </div>
              {driver.lat ? (
                <div id={`detail-map-${driverId}`} className="h-52 rounded-xl border overflow-hidden" />
              ) : (
                <div className="h-36 bg-gray-50 border rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
                  <MapPin size={22} className="opacity-30" />
                  {driver.isOnline ? "Đang chờ tín hiệu GPS..." : "Driver offline — không có vị trí"}
                </div>
              )}
            </div>

            {/* Current Active Order */}
            {driver.currentOrder ? (
              <div>
                <p className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                  <Package size={14} className="text-brand-500" /> Đơn hàng đang giao
                </p>
                <div className="border-2 border-brand-200 bg-brand-50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-base">#{driver.currentOrder.orderNumber}</p>
                      <p className="text-sm text-gray-600 font-medium">{driver.currentOrder.customerName}</p>
                      <p className="text-xs text-gray-400">{driver.currentOrder.customerPhone}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[driver.currentOrder.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[driver.currentOrder.status] ?? driver.currentOrder.status}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 mb-3 text-xs text-gray-500">
                    <MapPin size={11} className="shrink-0 mt-0.5" />
                    {driver.currentOrder.deliveryAddress?.street}, {driver.currentOrder.deliveryAddress?.city}, {driver.currentOrder.deliveryAddress?.state}
                  </div>
                  <div className="bg-white rounded-lg border p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sản phẩm</p>
                    {driver.currentOrder.items?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">🍷 {item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-2 border-t mt-1">
                      <span>Tổng</span>
                      <span className="text-brand-600">${Number(driver.currentOrder.total).toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={10} /> Đặt lúc {new Date(driver.currentOrder.createdAt).toLocaleTimeString("vi-VN")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border rounded-xl p-4 text-center text-sm text-gray-400">
                {driver.isOnline ? "Chưa nhận đơn nào" : "Driver đang offline"}
              </div>
            )}

            {/* Order History */}
            <div>
              <p className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                <Clock size={14} className="text-brand-500" /> Lịch sử giao hàng ({driver.orders?.length ?? 0} đơn)
              </p>
              {!driver.orders?.length ? (
                <div className="text-center text-gray-400 text-sm py-8 border rounded-xl">Chưa có đơn nào</div>
              ) : (
                <div className="space-y-2">
                  {driver.orders.map(order => (
                    <OrderHistoryCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderHistoryCard({ order }: { order: DriverOrder }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div>
          <p className="font-semibold text-sm">#{order.orderNumber}</p>
          <p className="text-xs text-gray-500">
            {order.customerName} · {new Date(order.createdAt).toLocaleDateString("vi-VN")} {new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <span className="font-bold text-sm text-brand-600">${Number(order.total).toFixed(2)}</span>
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t bg-gray-50 pt-3 space-y-2">
          <div className="text-xs text-gray-500 flex items-start gap-1.5">
            <MapPin size={11} className="shrink-0 mt-0.5" />
            {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.zip}
          </div>
          <div className="bg-white border rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sản phẩm trong đơn</p>
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>🍷 {item.name} <span className="text-gray-400 text-xs">×{item.quantity}</span></span>
                <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span>Tổng đơn</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DriversPage() {
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState<Partial<Driver> | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [modalError, setModalError] = useState("");
  const qc = useQueryClient();
  const refetch = () => qc.invalidateQueries({ queryKey: ["admin-drivers"] });

  const { data: drivers = [], isLoading } = useQuery<Driver[]>({
    queryKey: ["admin-drivers"],
    queryFn: async () => { const r = await fetch(`${API}/admin/drivers`); return r.json(); },
    refetchInterval: 10_000,
  });

  const createM = useMutation({
    mutationFn: async (body: typeof EMPTY_FORM) => {
      const r = await fetch(`${API}/admin/drivers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Failed"); return d;
    },
    onSuccess: () => { refetch(); setShowModal(false); setModalError(""); },
    onError: (e: Error) => setModalError(e.message),
  });

  const updateM = useMutation({
    mutationFn: async ({ id, ...body }: typeof EMPTY_FORM & { id: string }) => {
      const r = await fetch(`${API}/admin/drivers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Failed"); return d;
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["admin-driver-detail", editDriver?.id] });
      setShowModal(false); setModalError("");
    },
    onError: (e: Error) => setModalError(e.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => fetch(`${API}/admin/drivers/${id}`, { method: "DELETE" }),
    onSuccess: () => { refetch(); if (detailId) setDetailId(null); },
  });

  const toggleM = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      fetch(`${API}/admin/drivers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }),
    onSuccess: refetch,
  });

  function openAdd() { setEditDriver(null); setModalError(""); setShowModal(true); }
  function openEdit(d: Driver) { setEditDriver(d); setModalError(""); setShowModal(true); }
  function handleSave(data: typeof EMPTY_FORM) {
    if (editDriver?.id) updateM.mutate({ ...data, id: editDriver.id } as any);
    else createM.mutate(data);
  }

  const online = drivers.filter(d => d.isOnline).length;
  const onDelivery = drivers.filter(d => d.currentOrder).length;
  const activeCount = drivers.filter(d => d.active).length;
  const available = drivers.filter(d => d.isOnline && !d.currentOrder).length;
  const offline = drivers.filter(d => !d.isOnline).length;
  const saving = createM.isPending || updateM.isPending;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Quản Lý Driver</h1>
          <p className="text-gray-500 text-sm">{drivers.length} driver · {online} online · {available} sẵn sàng · {onDelivery} đang giao</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-colors">
          <Plus size={16} /> Thêm Driver
        </button>
      </div>

      {/* Availability overview */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: "Tổng Driver", value: drivers.length, bg: "bg-blue-50", text: "text-blue-700", dot: "" },
          { label: "Active", value: activeCount, bg: "bg-gray-50", text: "text-gray-700", dot: "" },
          { label: "🟢 Online", value: online, bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
          { label: "✅ Sẵn sàng", value: available, bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" },
          { label: "🚗 Đang giao", value: onDelivery, bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl border p-4 text-center relative`}>
            {s.dot && <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${s.dot} ${s.dot === "bg-emerald-500" ? "animate-pulse" : ""}`} />}
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Availability alert */}
      {online > 0 && (
        <div className={`rounded-xl border px-4 py-3 mb-5 text-sm font-medium flex items-center gap-2 ${available > 0 ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${available > 0 ? "bg-green-500 animate-pulse" : "bg-amber-400"}`} />
          {available > 0
            ? `${available} driver sẵn sàng nhận đơn mới`
            : `Tất cả ${online} driver online đều đang bận giao hàng`}
        </div>
      )}
      {online === 0 && drivers.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-5 text-sm font-medium text-red-700 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          Không có driver nào đang online — {offline} driver offline
        </div>
      )}


      {/* Driver table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <p className="font-semibold text-sm">Danh sách Driver</p>
          <p className="text-xs text-gray-400">Click vào tên driver để xem chi tiết</p>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 size={28} className="animate-spin mx-auto mb-2" />Đang tải...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-xs">
                <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Driver</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Liên hệ</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Trạng thái</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Hôm nay</th>
                <th className="text-left px-4 py-3 font-semibold uppercase tracking-wide">Tổng</th>
                <th className="text-right px-5 py-3 font-semibold uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <Truck size={36} className="mx-auto mb-3 opacity-25" />
                    <p className="font-medium">Chưa có driver nào</p>
                    <p className="text-xs mt-1">Nhấn "Thêm Driver" để tạo tài khoản đầu tiên</p>
                  </td>
                </tr>
              ) : drivers.map(d => (
                <tr key={d.id} className={`group hover:bg-gray-50 transition-colors ${!d.active ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3.5">
                    <button onClick={() => setDetailId(d.id)}
                      className="flex items-center gap-2.5 text-left hover:underline">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${d.isOnline ? "bg-green-500" : "bg-gray-400"}`}>
                        {d.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-brand-600">{d.name}</p>
                        <p className="text-xs text-gray-400 font-mono">@{d.username}</p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-gray-600">{d.phone || "—"}</p>
                    <p className="text-xs text-gray-400">{d.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-1.5">
                      <span className={`flex items-center gap-1.5 text-xs font-medium w-fit ${d.isOnline ? "text-green-600" : "text-gray-400"}`}>
                        <span className={`w-2 h-2 rounded-full ${d.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                        {d.isOnline ? "Online" : "Offline"}
                      </span>
                      {d.currentOrder && (
                        <span className="block text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full w-fit">Đang giao</span>
                      )}
                      {!d.active && (
                        <span className="block text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full w-fit">Deactivated</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold">{d.todayDeliveries} orders</p>
                    <p className="text-xs text-gray-500">${Number(d.todayEarnings).toFixed(2)} sales</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold">{d.totalDeliveries}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-0.5">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" />{d.rating}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setDetailId(d.id)} title="Chi tiết"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => openEdit(d)} title="Chỉnh sửa"
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => toggleM.mutate({ id: d.id, active: !d.active })}
                        title={d.active ? "Deactivate" : "Activate"}
                        className={`p-1.5 rounded-lg transition-colors ${d.active ? "text-gray-400 hover:text-amber-500 hover:bg-amber-50" : "text-green-500 hover:bg-green-50"}`}>
                        {d.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Xóa driver "${d.name}"?`)) deleteM.mutate(d.id); }}
                        title="Xóa"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <DriverModal
          driver={editDriver}
          onClose={() => { setShowModal(false); setModalError(""); }}
          onSave={handleSave}
          saving={saving}
          error={modalError}
        />
      )}

      {/* Detail slide-over */}
      {detailId && (
        <DriverDetailPanel
          driverId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={d => { setDetailId(null); openEdit(d); }}
        />
      )}
    </div>
  );
}
