import Link from "next/link";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { OrderSummary } from "@/components/cart/OrderSummary";

export const metadata = { title: "Pick Up Checkout — Cold Spring Liquor" };

export default function PickupCheckoutPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-main py-6 sm:py-10">
        <Link href="/checkout" className="inline-block text-sm font-bold text-brand-600 hover:text-brand-700 mb-3">
          ← Change back to Delivery
        </Link>
        <div className="mb-5 sm:mb-7">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">🏬 Pick Up Checkout</h1>
          <p className="text-sm text-gray-500 mt-1">💚 Save 10% · 🔒 Secure · 21+ photo ID required at pickup</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-8 items-start">
          <CheckoutForm mode="pickup" />
          <div className="hidden lg:block">
            <OrderSummary mode="pickup" />
          </div>
        </div>
      </div>
    </div>
  );
}
