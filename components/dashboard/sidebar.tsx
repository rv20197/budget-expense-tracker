"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Wallet } from "lucide-react";

import { DASHBOARD_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";

type SidebarProps = Readonly<{
  userName: string;
  isOpen?: boolean;
  onClose?: () => void;
}>;

export function Sidebar({ userName, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const nav = (
    <div className="flex h-full flex-col rounded-[28px] bg-slate-950 p-5 text-white lg:rounded-none lg:p-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <div className="rounded-2xl bg-white/10 p-3">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-300">Budget Tracker</p>
          <p className="font-semibold">{userName}</p>
        </div>
      </div>
      <nav className="mt-6 grid gap-1">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm transition min-h-[44px] flex items-center",
                isActive
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
              onClick={() => onClose?.()}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="pt-6">
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => onClose?.()}
          />
          <div className="fixed left-0 top-0 z-50 h-full w-[280px] transform transition-transform duration-300 ease-in-out lg:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-end p-4">
                <Button
                  variant="ghost"
                  onClick={() => onClose?.()}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 px-4 pb-4">
                {nav}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[240px] lg:block">
        {nav}
      </aside>
    </>
  );
}
