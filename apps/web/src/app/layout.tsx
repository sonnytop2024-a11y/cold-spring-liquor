import type { Metadata } from "next";
import { Inter, Playfair_Display, Montserrat } from "next/font/google";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${montserrat.variable} font-sans bg-white text-gray-900`}>
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
