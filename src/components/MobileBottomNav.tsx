"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AccountBalance as AccountBalanceIcon,
  Category as CategoryIcon,
  CreditCard as CreditCardIcon,
  Home as HomeIcon,
} from "@mui/icons-material";

const BOTTOM_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/transactions", label: "Transactions", icon: CreditCardIcon },
  { href: "/categories", label: "Categories", icon: CategoryIcon },
  { href: "/debt", label: "Debt", icon: AccountBalanceIcon },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 lg:hidden pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors min-h-[44px] px-1 ${
                isActive
                  ? "text-slate-950 font-semibold"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate max-w-full text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
