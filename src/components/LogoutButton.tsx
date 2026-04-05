"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { logoutAction } from "@/features/auth/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      className="justify-start"
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
