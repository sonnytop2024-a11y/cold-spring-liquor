import Image from "next/image";
import Link from "next/link";

// Circular photo tiles — icons live in public/category-icons/*.webp.
// "citrus" and "new-sips" are curated entries (search / featured filter), not DB categories.
const CATEGORIES: {
  name: string;
  href: string;
  icon: string;
  badge?: string;
  shopNow?: boolean;
}[] = [
  { name: "Whiskey", href: "/products?category=whiskey", icon: "whiskey" },
  { name: "Wine", href: "/products?category=wine", icon: "wine" },
  { name: "Beer", href: "/products?category=beer", icon: "beer" },
  { name: "Tequila", href: "/products?category=tequila", icon: "tequila", shopNow: true },
  { name: "Vodka", href: "/products?category=vodka", icon: "vodka" },
  { name: "Rum", href: "/products?category=rum", icon: "rum" },
  { name: "Gin", href: "/products?category=gin", icon: "gin" },
  { name: "Champagne", href: "/products?category=champagne", icon: "champagne" },
  { name: "Cognac", href: "/products?category=cognac", icon: "cognac" },
  { name: "Sake & Soju", href: "/products?category=sake_soju", icon: "soju" },
  { name: "Ready-to-Drink Sips", href: "/products?category=rtd", icon: "rtd" },
  { name: "Vape & Cigarettes", href: "/products?category=vape_cigarettes", icon: "vape" },
  { name: "Orange & Citrus Curated Picks", href: "/products?q=citrus", icon: "citrus" },
  { name: "New Sips to Try", href: "/products?featured=true", icon: "newpick", badge: "NEW" },
];

export function FeaturedCategories() {
  return (
    <section className="py-16" style={{ background: "#0d0d0d" }}>
      <div className="container-main">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#f97316" }}>
              Browse
            </p>
            <h2 className="font-heading text-3xl md:text-4xl font-black text-white">Shop By Category</h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold transition-colors"
            style={{ color: "#f97316" }}
          >
            View All Categories →
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-2.5 gap-y-5 lg:gap-x-4 lg:gap-y-6">
          {CATEGORIES.map((cat, i) => (
            <Link key={cat.icon} href={cat.href} className="group relative flex flex-col items-center text-center">
              <div
                className="relative w-full aspect-square rounded-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5"
                style={{
                  background: "#0a0a0a",
                  boxShadow: "0 8px 20px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.08)",
                }}
              >
                <Image
                  src={`/category-icons/${cat.icon}.webp`}
                  alt={cat.name}
                  width={240}
                  height={240}
                  priority={i < 3}
                  className="w-full h-full object-cover"
                />
              </div>
              {cat.badge && (
                <div
                  className="absolute -top-1 right-[2%] z-10 text-white text-[9px] font-extrabold px-2 py-1 rounded-full"
                  style={{
                    background: "linear-gradient(135deg,#ff5c5c,#c0392b)",
                    boxShadow: "0 3px 8px rgba(0,0,0,.45)",
                  }}
                >
                  {cat.badge}
                </div>
              )}
              <p className="text-[13px] font-bold text-white mt-2.5 leading-tight">{cat.name}</p>
              {cat.shopNow && (
                <p className="text-[11px] font-bold mt-0.5" style={{ color: "#5fd08a" }}>
                  Shop Now →
                </p>
              )}
            </Link>
          ))}
        </div>

        <Link href="/products" className="sm:hidden block text-center mt-6 text-sm font-semibold" style={{ color: "#f97316" }}>
          View All Categories →
        </Link>
      </div>
    </section>
  );
}
