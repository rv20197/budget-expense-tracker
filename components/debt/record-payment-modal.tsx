"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { recordPayment } from "@/lib/actions/debt.actions";
import {
  recordPaymentSchema,
  type RecordPaymentInput,
} from "@/lib/validations/debt.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type RecordPaymentModalProps = Readonly<{
  open: boolean;
  debtId: string;
  debtName: string;
  onClose: () => void;
}>;

export function RecordPaymentModal({
  open,
  debtId,
  debtName,
  onClose,
}: RecordPaymentModalProps) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: "",
      paidOn: new Date().toISOString().slice(0, 10),
      note: "",
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Record payment for ${debtName}`}
      description="Payments reduce the remaining balance and can mark a debt as paid off."
    >
      <form
        className="grid gap-4"
        onSubmit={handleSubmit((values) =>
          startTransition(async () => {
            const result = await recordPayment(debtId, values);

            if (!result.success) {
              toast.error(result.error);
              return;
            }

            toast.success("Payment recorded.");
            reset();
            onClose();
          }),
        )}
      >
        <Input
          label="Amount"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register("amount")}
        />
        <Input
          label="Paid on"
          type="date"
          error={errors.paidOn?.message}
          {...register("paidOn")}
        />
        <Input
          label="Note"
          placeholder="Optional payment note"
          error={errors.note?.message}
          {...register("note")}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Saving..." : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
