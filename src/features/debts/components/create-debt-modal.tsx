"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createDebt } from "@/features/debts/actions/debt.actions";
import {
  createDebtSchema,
  type CreateDebtInput,
} from "@/features/debts/schemas/debt.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

type CreateDebtModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

export function CreateDebtModal({ open, onClose }: CreateDebtModalProps) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDebtInput>({
    resolver: zodResolver(createDebtSchema),
    defaultValues: {
      name: "",
      direction: "DEBT",
      counterparty: "",
      principal: "",
      interestRate: "0",
      interestType: "NONE",
      dueDate: undefined,
      nextPaymentDate: undefined,
      installmentAmount: "",
      notes: "",
    },
  });

  const direction = useWatch({ control, name: "direction" });
  const interestType = useWatch({ control, name: "interestType" });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add debt or loan"
      description="Track money you owe and money owed back to you in one place."
    >
      <form
        className="grid gap-4"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            const result = await createDebt(values);

            if (!result.success) {
              toast.error(result.error);
              return;
            }

            toast.success("Debt created.");
            reset();
            onClose();
          }),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Select
            label="Direction"
            options={[
              { label: "My Debts", value: "DEBT" },
              { label: "My Loans", value: "LOAN" },
            ]}
            error={errors.direction?.message}
            {...register("direction")}
          />
        </div>
        <Input
          label={direction === "LOAN" ? "Borrower name" : "Lender name"}
          error={errors.counterparty?.message}
          {...register("counterparty")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Principal"
            placeholder="0.00"
            error={errors.principal?.message}
            {...register("principal")}
          />
          <Select
            label="Interest type"
            options={[
              { label: "None", value: "NONE" },
              { label: "Simple", value: "SIMPLE" },
              { label: "Compound", value: "COMPOUND" },
            ]}
            error={errors.interestType?.message}
            {...register("interestType")}
          />
        </div>
        {interestType !== "NONE" ? (
          <Input
            label="Interest rate (%)"
            placeholder="0.00"
            error={errors.interestRate?.message}
            {...register("interestRate")}
          />
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Due date"
            type="date"
            error={errors.dueDate?.message}
            {...register("dueDate")}
          />
          <Input
            label="Next payment date"
            type="date"
            error={errors.nextPaymentDate?.message}
            {...register("nextPaymentDate")}
          />
        </div>
        <Input
          label="Installment amount"
          placeholder="0.00"
          error={errors.installmentAmount?.message}
          {...register("installmentAmount")}
        />
        <Input
          label="Notes"
          placeholder="Optional notes"
          error={errors.notes?.message}
          {...register("notes")}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Saving..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
