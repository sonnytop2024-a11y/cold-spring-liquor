import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { OrderSummary } from "@/components/cart/OrderSummary";

export default function CheckoutPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container-main py-6 sm:py-10">
        <div className="mb-5 sm:mb-7">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-500 mt-1">🔒 Secure · 21+ required · ID checked at delivery</p>
        </div>
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
