import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { CheckoutHeader } from "@/components/cart/CheckoutHeader";

export const metadata = { title: "Pick Up Checkout — Cold Spring Liquor" };

export default function PickupCheckoutPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-main py-6 sm:py-10">
        <CheckoutHeader initialMode="pickup" />
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
