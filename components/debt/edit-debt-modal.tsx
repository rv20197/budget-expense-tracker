"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { updateDebt } from "@/lib/actions/debt.actions";
import {
  updateDebtSchema,
  type UpdateDebtInput,
} from "@/lib/validations/debt.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

type EditDebtModalProps = Readonly<{
  open: boolean;
  debt: {
    id: string;
    name: string;
    direction: "DEBT" | "LOAN";
    counterparty: string;
    principal: string;
    interestRate: string;
    interestType: "NONE" | "SIMPLE" | "COMPOUND";
    dueDate: string | null;
    nextPaymentDate: string | null;
    installmentAmount: string | null;
    notes: string | null;
  } | null;
  onClose: () => void;
}>;

export function EditDebtModal({ open, debt, onClose }: EditDebtModalProps) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateDebtInput>({
    resolver: zodResolver(updateDebtSchema),
    values: debt
      ? {
          name: debt.name,
          counterparty: debt.counterparty,
          interestRate: debt.interestRate,
          interestType: debt.interestType,
          dueDate: debt.dueDate ?? undefined,
          nextPaymentDate: debt.nextPaymentDate ?? undefined,
          installmentAmount: debt.installmentAmount ?? "",
          notes: debt.notes ?? "",
        }
      : undefined,
  });

  const interestType = useWatch({ control, name: "interestType" });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit debt"
      description="Principal and direction are locked after creation."
    >
      {debt ? (
        <form
          className="grid gap-4"
          onSubmit={handleSubmit((values) =>
            startTransition(async () => {
              const result = await updateDebt(debt.id, values);

              if (!result.success) {
                toast.error(result.error);
                return;
              }

              toast.success("Debt updated.");
              onClose();
            }),
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Name" error={errors.name?.message} {...register("name")} />
            <Input label="Direction" value={debt.direction} disabled />
          </div>
          <Input label="Counterparty" error={errors.counterparty?.message} {...register("counterparty")} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Principal" value={debt.principal} disabled />
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
              error={errors.interestRate?.message}
              {...register("interestRate")}
            />
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Due date" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
            <Input
              label="Next payment date"
              type="date"
              error={errors.nextPaymentDate?.message}
              {...register("nextPaymentDate")}
            />
          </div>
          <Input
            label="Installment amount"
            error={errors.installmentAmount?.message}
            {...register("installmentAmount")}
          />
          <Input label="Notes" error={errors.notes?.message} {...register("notes")} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
