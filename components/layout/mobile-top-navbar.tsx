"use client";

import { Menu, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";

type MobileTopNavbarProps = Readonly<{
  onMenuClick: () => void;
}>;

export function MobileTopNavbar({ onMenuClick }: MobileTopNavbarProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-white border-b border-slate-200 lg:hidden">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-950 p-1.5">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-slate-950">Budget Tracker</span>
        </div>
        <Button variant="ghost" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}