"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, User, Search, Menu, X, Gift, LogOut, ChevronDown, Star, Package } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { CartDrawer } from "@/components/cart/CartDrawer";

const NAV = [
  { href: "/products", label: "Shop All" },
  { href: "/products?category=whiskey", label: "Whiskey" },
  { href: "/products?category=wine", label: "Wine" },
  { href: "/products?category=beer", label: "Beer" },
  { href: "/products?sale=true", label: "Deals", highlight: true },
  { href: "/rewards", label: "Rewards", highlight: true },
];

function AccountMenu() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="hidden md:flex items-center gap-1.5">
        <Link href="/auth/login"
          className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/8 transition-colors">
          Sign In
        </Link>
        <Link href="/auth/register"
          className="text-sm font-bold text-white px-4 py-1.5 rounded-lg transition-colors"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
          Join Free
        </Link>
      </div>
    );
  }

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors py-1.5 px-2 rounded-lg hover:bg-white/5"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
        >
          {user!.name.charAt(0).toUpperCase()}
        </div>
        <span className="max-w-24 truncate font-medium">{user!.name.split(" ")[0]}</span>
        <ChevronDown size={13} className="text-gray-500" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-60 rounded-2xl shadow-2xl border z-50 overflow-hidden"
          style={{ background: "#1a1a1a", borderColor: "rgba(255,255,255,0.1)" }}
        >
          <div className="px-4 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(249,115,22,0.08)" }}>
            <p className="font-bold text-sm text-white">{user!.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{user!.email}</p>
            <div className="flex items-center gap-1.5 mt-2 bg-black/20 rounded-lg px-2.5 py-1.5 w-fit">
              <Star size={11} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">{user!.points.toLocaleString()} pts</span>
              <span className="text-xs text-gray-500">· {user!.tier}</span>
            </div>
          </div>
          <div className="py-2">
            {[
              { href: "/account", icon: User, label: "My Account" },
              { href: "/account/orders", icon: Package, label: "My Orders" },
              { href: "/rewards", icon: Star, label: "CS Rewards" },
              { href: "/gift-cards", icon: Gift, label: "Gift Cards" },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon size={14} className="text-gray-600" />
                {label}
              </Link>
            ))}
          </div>
          <div className="border-t py-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <button
              onClick={async () => { setOpen(false); await logout(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { user, isLoggedIn, logout, fetchMe } = useAuthStore();
  const itemCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));

  useEffect(() => { fetchMe(); }, [fetchMe]);

  return (
    <>
      <header
        className="sticky top-0 z-40 shadow-lg"
        style={{
          background: "rgba(13,13,13,0.97)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="container-main flex items-center justify-between h-[76px]">
          {/* Logo */}
          <Link href="/" className="flex flex-row items-center gap-2 shrink-0 group">
            <Image
              src="/logo-transparent.png"
              alt="Cold Spring Liquor"
              width={80}
              height={80}
              className="w-[54px] h-[54px] sm:w-[62px] sm:h-[62px] md:w-[80px] md:h-[80px] object-contain mt-3"
              priority
            />
            <div className="flex flex-col">
            <span className="font-heading text-xl font-black text-white tracking-tight group-hover:text-brand-400 transition-colors">
              Cold Spring Liquor
            </span>
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#f97316" }}>
              FREE Delivery · No Tip Required
            </span>
            <span
              className="hidden sm:block text-[8px] font-medium tracking-wide"
              style={{ color: "#9a845a" }}
            >
              15609 Ronald Reagan Blvd Ste B100 · Leander, TX 78641
            </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label, highlight }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium px-3.5 py-2 rounded-lg transition-all ${
                  highlight
                    ? "font-bold hover:bg-brand-500/15"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                style={highlight ? { color: "#f97316" } : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <AccountMenu />

            <Link href="/products"
              className="p-2.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors hidden sm:block">
              <Search size={18} />
            </Link>
            <Link href="/gift-cards"
              className="p-2.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors hidden lg:block"
              title="Gift Cards">
              <Gift size={18} />
            </Link>

            {isLoggedIn ? (
              <Link href="/account" className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <User size={18} />
              </Link>
            ) : (
              <Link href="/auth/login" className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <User size={18} />
              </Link>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ShoppingCart size={18} />
              {itemCount > 0 && (
                <span
                  key={itemCount}
                  className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-black rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] px-1 animate-cart-pop"
                  style={{ background: "#f97316", fontSize: "10px" }}
                >
                  {itemCount}
                </span>
              )}
            </button>

            <button
              className="md:hidden p-2.5 rounded-lg text-gray-400 hover:text-white transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: "#111111", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <nav className="container-main py-4 flex flex-col gap-1 text-sm">
              {NAV.map(({ href, label, highlight }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-lg font-medium transition-colors ${highlight ? "text-brand-400 hover:bg-brand-500/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                  {label}
                </Link>
              ))}
              <div className="border-t mt-2 pt-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {isLoggedIn ? (
                  <>
                    <Link href="/account" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-gray-400 hover:text-white rounded-lg">My Account ({user!.name.split(" ")[0]})</Link>
                    <Link href="/account/orders" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-gray-400 hover:text-white rounded-lg">My Orders</Link>
                    <button onClick={() => { setMenuOpen(false); logout(); }} className="block w-full text-left px-3 py-2.5 text-red-400 rounded-lg hover:bg-red-500/10">Sign Out</button>
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-gray-400 hover:text-white rounded-lg">Sign In</Link>
                    <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 font-bold rounded-lg" style={{ color: "#f97316" }}>Create Account →</Link>
                  </>
                )}
                <Link href="/gift-cards" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-gray-400 hover:text-white rounded-lg">🎁 Gift Cards</Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
