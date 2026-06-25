"use client";

import { Bell, User } from "lucide-react";
import { usePathname } from "next/navigation";

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

export function AdminHeader() {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? "Admin";

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0">
      {/* Mobile: page title + brand. Desktop: empty (sidebar has brand) */}
      <div className="md:hidden">
        <p className="font-bold text-gray-900 text-sm">{title}</p>
        <p className="text-[10px] text-gray-400 leading-none">Cold Spring Liquor</p>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
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
