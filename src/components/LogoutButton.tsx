"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { logoutAction } from "@/features/auth/actions/auth.actions";

type LogoutButtonProps = Readonly<{
  className?: string;
  onClick?: () => void;
}>;

export function LogoutButton({ className, onClick }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={
        className ??
        "w-full rounded-2xl px-4 py-2.5 text-sm font-normal text-slate-300 transition min-h-[40px] flex items-center text-left hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
      }
      onClick={() => {
        onClick?.();
        startTransition(async () => {
          toast.success("Signed out.");
          await logoutAction();
        });
      }}
    >
      {isPending ? "Signing out..." : "Logout"}
    </button>
  );
}

