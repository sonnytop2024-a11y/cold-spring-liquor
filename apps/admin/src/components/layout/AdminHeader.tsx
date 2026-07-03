"use client";

import { Bell, User, X, ShoppingBag, Clock, CheckCircle, Truck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/orders":    "Orders",
  "/customers": "Customers",
  "/drivers":   "Drivers",
  "/marketing": "Marketing",
  "/reports":   "Reports",
  "/settings":  "Settings",
};

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: number;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { label: string; color: string; Icon: typeof ShoppingBag }> = {
  pending:    { label: "New Order",   color: "text-orange-600 bg-orange-50",  Icon: ShoppingBag },
  confirmed:  { label: "Confirmed",   color: "text-blue-600 bg-blue-50",      Icon: CheckCircle },
  delivering: { label: "Delivering",  color: "text-purple-600 bg-purple-50",  Icon: Truck },
  delivered:  { label: "Delivered",   color: "text-green-600 bg-green-50",    Icon: CheckCircle },
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? "Admin";

  const [notifOpen, setNotifOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function openNotifications() {
    setNotifOpen(prev => !prev);
    if (!notifOpen) {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/orders?limit=20");
        if (res.ok) {
          const data = await res.json();
          const list: Order[] = (data.orders ?? data ?? []);
          // Sort newest first, show non-delivered first
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(list.slice(0, 10));
        }
      } catch {}
      finally { setLoading(false); }
    }
  }

  const newCount = orders.filter(o => o.status === "pending").length;

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0 relative z-30">
      <div className="md:hidden">
        <p className="font-bold text-gray-900 text-sm">{title}</p>
        <p className="text-[10px] text-gray-400 leading-none">Cold Spring Liquor</p>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifications}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={18} className={newCount > 0 ? "text-orange-500" : "text-gray-600"} />
            {newCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
                {newCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <p className="font-bold text-sm text-gray-900">Recent Orders</p>
                <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No orders yet</p>
                ) : (
                  orders.map(order => {
                    const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending;
                    const Icon = s.Icon;
                    return (
                      <button
                        key={order.id}
                        onClick={() => { setNotifOpen(false); router.push("/orders"); }}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 text-left transition-colors"
                      >
                        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${s.color}`}>
                          <Icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              #{order.orderNumber} · {order.customerName}
                            </p>
                            <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-0.5">
                              <Clock size={9} /> {timeAgo(order.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.color}`}>
                              {s.label}
                            </span>
                            <span className="text-xs font-bold text-gray-700">${Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2.5 border-t bg-gray-50">
                <button
                  onClick={() => { setNotifOpen(false); router.push("/orders"); }}
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600 w-full text-center"
                >
                  View all orders →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shrink-0">
            <User size={16} />
          </div>
          <span className="hidden sm:block">Admin</span>
        </div>
      </div>
    </header>
  );
}
