"use client";

import { Bell, User } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white">
            <User size={16} />
          </div>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
}
