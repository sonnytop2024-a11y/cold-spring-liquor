import { OrderHistory } from "@/components/account/OrderHistory";

export default function OrdersPage() {
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-8">Order History</h1>
      <OrderHistory />
    </div>
  );
}
