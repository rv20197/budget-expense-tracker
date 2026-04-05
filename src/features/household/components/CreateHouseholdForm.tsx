"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createHousehold } from "@/features/household/actions/createHousehold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CreateHouseholdValues = {
  name: string;
};

export function CreateHouseholdForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<CreateHouseholdValues>({
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      try {
        await createHousehold(values.name);
        toast.success("Household created.");
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to create household.",
        );
      }
    });
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Input
        label="Household name"
        placeholder="Family budget"
        error={errors.name?.message}
        {...register("name", {
          required: "Enter a household name.",
          minLength: {
            value: 2,
            message: "Use at least 2 characters.",
          },
        })}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create household"}
      </Button>
    </form>
  );
}
