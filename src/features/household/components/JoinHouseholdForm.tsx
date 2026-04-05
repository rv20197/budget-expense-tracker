"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { joinHousehold } from "@/features/household/actions/joinHousehold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JoinHouseholdValues = {
  inviteCode: string;
};

export function JoinHouseholdForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<JoinHouseholdValues>({
    defaultValues: {
      inviteCode: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      try {
        await joinHousehold(values.inviteCode);
        toast.success("Joined household.");
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to join household.",
        );
      }
    });
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Input
        label="Invite code"
        placeholder="ABCD1234"
        error={errors.inviteCode?.message}
        {...register("inviteCode", {
          required: "Enter an invite code.",
          minLength: {
            value: 8,
            message: "Use the 8-character code from your family.",
          },
          maxLength: {
            value: 12,
            message: "Invite code looks too long.",
          },
        })}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Joining..." : "Join household"}
      </Button>
    </form>
  );
}
