"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Wallet } from "lucide-react";
import { useState } from "react";

import { DASHBOARD_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";

type SidebarProps = Readonly<{
  userName: string;
}>;

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const nav = (
    <div className="flex h-full flex-col rounded-[28px] bg-slate-950 p-5 text-white">
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
                "rounded-2xl px-4 py-3 text-sm transition",
                isActive
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          <Menu className="mr-2 h-4 w-4" />
          Menu
        </Button>
        {isOpen ? (
          <div className="fixed inset-0 z-40 bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="h-full max-w-xs">{nav}</div>
          </div>
        ) : null}
      </div>
      <div className="hidden h-full lg:block">{nav}</div>
    </>
  );
}
