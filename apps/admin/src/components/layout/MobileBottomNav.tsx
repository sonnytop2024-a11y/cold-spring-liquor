"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingBag, Package, Car, Settings, MoreHorizontal,
  LayoutDashboard, Megaphone, Users, BarChart3, X, Tag, Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/orders",    label: "Orders",    icon: ShoppingBag },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/drivers",   label: "Drivers",   icon: Car },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

const MORE = [
  { href: "/dashboard",   label: "Dashboard",  icon: LayoutDashboard },
  { href: "/customers",   label: "Customers",  icon: Users },
  { href: "/gift-cards",  label: "Gift Cards", icon: Gift },
  { href: "/marketing",   label: "Marketing",  icon: Megaphone },
  { href: "/reports",     label: "Reports",    icon: BarChart3 },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MORE.some(t => pathname.startsWith(t.href));

  return (
    <>
      {/* Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex h-14">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  active ? "text-orange-500" : "text-gray-400"
                )}>
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setOpen(v => !v)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              open || moreActive ? "text-orange-500" : "text-gray-400"
            )}>
            <MoreHorizontal size={21} strokeWidth={open || moreActive ? 2.5 : 1.8} />
            More
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom,0px)] bg-white" />
      </nav>

      {/* More sheet overlay */}
      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom,16px)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b">
              <p className="font-semibold text-sm text-gray-700">More</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 p-1">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 p-4">
              {MORE.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors",
                      active ? "bg-orange-50 text-orange-500" : "text-gray-600 hover:bg-gray-50"
                    )}>
                    <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                    <span className="text-[11px] font-medium">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
