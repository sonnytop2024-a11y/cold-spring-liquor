"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Car,
  BarChart3,
  Settings,
  LogOut,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/drivers", label: "Drivers", icon: Car },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 bg-gray-900 text-white flex-col shrink-0">
      <div className="px-6 py-5 border-b border-white/10">
        <p className="font-bold text-brand-500">Cold Spring Liquor</p>
        <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-brand-500 text-white"
                : "text-gray-400 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors w-full">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
