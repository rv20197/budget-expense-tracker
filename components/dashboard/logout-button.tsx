"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { logoutAction } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          toast.success("Signed out.");
          await logoutAction();
        })
      }
    >
      {isPending ? "Signing out..." : "Logout"}
    </Button>
  );
}
