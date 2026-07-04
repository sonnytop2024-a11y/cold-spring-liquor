import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { CheckoutHeader } from "@/components/cart/CheckoutHeader";

export default function CheckoutPage() {
  return (
    <div className="bg-gray-50 min-h-screen checkout-font">
      <div className="container-main py-6 sm:py-10">
        <CheckoutHeader initialMode="delivery" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 lg:gap-8 items-start">
          <CheckoutForm />
          <div className="hidden lg:block">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
