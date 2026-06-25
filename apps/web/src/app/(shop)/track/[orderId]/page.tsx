import { OrderTracker } from "@/components/tracking/OrderTracker";
import { dbGetSettings } from "@/lib/db";

export default async function TrackOrderPage({ params }: { params: { orderId: string } }) {
  const settings = await dbGetSettings();
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-6">Track Your Order</h1>
      <OrderTracker
        orderId={params.orderId}
        storePhone={settings.storePhone}
        storeTextPhone={settings.storeTextPhone}
        storeAddress={settings.storeAddress}
      />
    </div>
  );
}
