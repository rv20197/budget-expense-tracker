"use client";

import { useState } from "react";

import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileTopNavbar } from "@/components/layout/mobile-top-navbar";
import { Sidebar } from "@/components/dashboard/sidebar";

type DashboardLayoutClientProps = Readonly<{
  userName: string;
  email: string;
  children: React.ReactNode;
}>;

export function DashboardLayoutClient({
  userName,
  email,
  children,
}: DashboardLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <MobileTopNavbar onMenuClick={() => setIsSidebarOpen(true)} />
      <div className="flex flex-1 pt-14 lg:pt-0">
        <Sidebar userName={userName} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 lg:ml-[240px] pb-20 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <header className="mb-6 lg:mb-8">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 lg:text-sm">
                    Budget Tracker
                  </p>
                  <h1 className="text-xl font-bold text-slate-950 lg:text-2xl">
                    Welcome back, {userName}
                  </h1>
                </div>
                <p className="text-sm text-slate-600">{email}</p>
              </div>
            </header>
            {children}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
