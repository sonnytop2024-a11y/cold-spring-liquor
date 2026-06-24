import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { OrderSummary } from "@/components/cart/OrderSummary";

export default function CheckoutPage() {
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-6">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CheckoutForm />
        </div>
        <div>
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}
