import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Montserrat, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AgeGateModal } from "@/components/auth/AgeGateModal";
import { StickyBanner } from "@/components/layout/StickyBanner";
import { WelcomeBonus } from "@/components/promotions/WelcomeBonus";
import { CartSyncProvider } from "@/components/cart/CartSyncProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["600", "700", "800"] });
// Product typography — same family Total Wine uses
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-product", weight: ["400", "600", "700", "900"] });

export const metadata: Metadata = {
  title: "Cold Spring Liquor | FREE Delivery in Leander, Cedar Park & Liberty Hill",
  description:
    "Premium liquor delivered FREE to your door in 10–30 minutes. No tip required. Serving Leander, Cedar Park & Liberty Hill, TX.",
  keywords:
    "liquor delivery Leander TX, free liquor delivery, Cedar Park liquor, Liberty Hill liquor, Cold Spring Liquor",
  icons: {
    icon: [{ url: "/Logo.PNG", type: "image/png" }],
    shortcut: "/Logo.PNG",
    apple: "/Logo.PNG",
  },
};

// iOS Safari tints the status bar / notch area from this — without it the
// area around the camera cutout defaults to white regardless of page content.
// viewportFit "cover" is required alongside themeColor for Safari to extend
// the tint into the notch/Dynamic Island safe area instead of just the tab bar.
export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${montserrat.variable} ${sourceSans.variable} font-sans bg-white text-gray-900`}>
        <Providers>
          <CartSyncProvider />
          <AgeGateModal />
          <WelcomeBonus />
          <StickyBanner />
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
