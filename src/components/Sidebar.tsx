"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CloseIcon from "@mui/icons-material/Close";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

import { DASHBOARD_NAV_ITEMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/LogoutButton";

type SidebarProps = Readonly<{
  userName: string;
  isOpen?: boolean;
  onClose?: () => void;
}>;

export function Sidebar({ userName, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <div className="flex h-full flex-col bg-slate-950 p-5 text-white lg:p-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <AccountBalanceWalletIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Budget Wise</p>
            <p className="font-semibold text-sm truncate max-w-[140px] text-white">{userName}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition lg:hidden"
            aria-label="Close sidebar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="mt-5 grid gap-1 flex-1 overflow-y-auto no-scrollbar">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-2.5 text-sm transition min-h-[40px] flex items-center ${isActive
                ? "bg-white text-slate-950 font-medium shadow-sm"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              onClick={() => onClose?.()}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="pt-4 border-t border-white/10 mt-auto">
        <LogoutButton onClick={() => onClose?.()} />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
            onClick={() => onClose?.()}
          />
          <aside className="fixed left-0 top-0 z-[60] h-full w-[280px] max-w-[85vw] bg-slate-950 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden">
            {navContent}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-[240px] border-r border-slate-800 bg-slate-950 lg:block">
        {navContent}
      </aside>
    </>
  );
}
