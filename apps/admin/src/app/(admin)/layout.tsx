import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NewOrderNotifier } from "@/components/NewOrderNotifier";
import { PushRegistrar } from "@/components/PushRegistrar";
import { verifyAdminSession, ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECRET_FALLBACK } from "@/lib/adminSession";

// Every admin page renders through this layout — verify the login session
// here so an unauthenticated visitor is bounced to /login before any admin
// UI or data loads. The /login page lives outside this route group, so it
// stays reachable.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SESSION_SECRET ?? ADMIN_SESSION_SECRET_FALLBACK;
  if (!(await verifyAdminSession(token, secret))) redirect("/login");

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
      <PushRegistrar />
    </div>
  );
}
