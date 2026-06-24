import { CartView } from "@/components/cart/CartView";

export default function CartPage() {
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-6">Your Cart</h1>
      <CartView />
    </div>
  );
}
