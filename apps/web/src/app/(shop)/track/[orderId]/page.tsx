import { OrderTracker } from "@/components/tracking/OrderTracker";
import { DriverMap } from "@/components/tracking/DriverMap";
import { dbGetSettings } from "@/lib/db";

export default async function TrackOrderPage({ params }: { params: { orderId: string } }) {
  const settings = await dbGetSettings();
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-6">Track Your Order</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OrderTracker
          orderId={params.orderId}
          storePhone={settings.storePhone}
          storeTextPhone={settings.storeTextPhone}
          storeAddress={settings.storeAddress}
        />
        <DriverMap orderId={params.orderId} />
      </div>
    </div>
  );
}
