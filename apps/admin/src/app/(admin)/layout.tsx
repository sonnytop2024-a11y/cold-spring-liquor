import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NewOrderNotifier } from "@/components/NewOrderNotifier";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader />
        {/* pb-16 on mobile = space above bottom nav */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <NewOrderNotifier />
    </div>
  );
}
