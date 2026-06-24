import { OrderTracker } from "@/components/tracking/OrderTracker";
import { DriverMap } from "@/components/tracking/DriverMap";

export default function TrackOrderPage({ params }: { params: { orderId: string } }) {
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-6">Track Your Order</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OrderTracker orderId={params.orderId} />
        <DriverMap orderId={params.orderId} />
      </div>
    </div>
  );
}
