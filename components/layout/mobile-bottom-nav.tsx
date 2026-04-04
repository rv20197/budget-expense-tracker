"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  DollarSign,
  HandCoins,
  Home,
  PieChart,
  Settings,
  Tag,
  Timer,
} from "lucide-react";

import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/budgets", label: "Budgets", icon: DollarSign },
  { href: "/debt", label: "Debt", icon: HandCoins },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 lg:hidden">
      <div className="grid grid-cols-4 h-16">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors min-h-[44px]",
                isActive
                  ? "text-slate-950"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only sm:not-sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}