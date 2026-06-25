"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, Car, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders",    label: "Orders",    icon: ShoppingBag },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/drivers",   label: "Drivers",   icon: Car },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex h-14">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-orange-500" : "text-gray-400",
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
      {/* iPhone home indicator space */}
      <div className="h-[env(safe-area-inset-bottom,0px)] bg-white" />
    </nav>
  );
}
