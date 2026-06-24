import { AccountDashboard } from "@/components/account/AccountDashboard";

export default function AccountPage() {
  return (
    <div className="container-main py-8">
      <h1 className="text-3xl font-heading font-bold mb-8">My Account</h1>
      <AccountDashboard />
    </div>
  );
}
