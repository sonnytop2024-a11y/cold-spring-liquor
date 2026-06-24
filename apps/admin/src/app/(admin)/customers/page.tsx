"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Star, Crown } from "lucide-react";

async function fetchCustomers(search: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/customers${q}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
  });
  return res.json();
}

const VIP_BADGE: Record<string, JSX.Element> = {
  platinum: <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"><Crown size={10} />Platinum</span>,
  gold: <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full"><Star size={10} />Gold</span>,
  silver: <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Silver</span>,
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers", search],
    queryFn: () => fetchCustomers(search),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-gray-500 text-sm">{customers.length} registered customers</p>
      </div>

      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">VIP Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Orders</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Total Spent</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Points</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No customers found</td>
                  </tr>
                ) : (
                  customers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.displayName || "—"}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {c.rewards?.vipTier ? VIP_BADGE[c.rewards.vipTier] : <span className="text-gray-400 text-xs">None</span>}
                      </td>
                      <td className="px-4 py-3 font-medium">{c.orderCount ?? 0}</td>
                      <td className="px-4 py-3 font-medium">${Number(c.rewards?.totalSpend ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-brand-600 font-medium">{c.rewards?.totalPoints ?? 0} pts</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
