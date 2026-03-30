"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createTransaction,
  updateTransaction,
} from "@/lib/actions/transactions.actions";
import {
  transactionSchema,
  type TransactionInput,
} from "@/lib/validations/finance.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

type TransactionFormProps = Readonly<{
  open: boolean;
  onClose: () => void;
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense";
  }>;
  transaction?: {
    id: string;
    categoryId: string;
    type: "income" | "expense";
    description: string;
    amount: string;
    transactionDate: string;
    notes: string | null;
  } | null;
}>;

export function TransactionForm({
  open,
  onClose,
  categories,
  transaction,
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(transaction);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    values: transaction
      ? {
          id: transaction.id,
          categoryId: transaction.categoryId,
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          transactionDate: transaction.transactionDate,
          notes: transaction.notes ?? "",
        }
      : {
          categoryId: "",
          type: "expense",
          description: "",
          amount: "",
          transactionDate: new Date().toISOString().slice(0, 10),
          notes: "",
        },
  });

  const selectedType = useWatch({ control, name: "type" });
  const categoryOptions = categories
    .filter((category) => category.type === selectedType)
    .map((category) => ({
      label: category.name,
      value: category.id,
    }));

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = transaction
        ? await updateTransaction(transaction.id, values)
        : await createTransaction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEditing ? "Transaction updated." : "Transaction created.",
      );
      reset();
      onClose();
    });
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={isEditing ? "Edit transaction" : "Add transaction"}
      description="Every transaction updates your reports, budgets, and dashboard."
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Type"
            options={[
              { label: "Expense", value: "expense" },
              { label: "Income", value: "income" },
            ]}
            error={errors.type?.message}
            {...register("type")}
          />
          <Select
            label="Category"
            options={categoryOptions}
            placeholder="Select category"
            error={errors.categoryId?.message}
            {...register("categoryId")}
          />
        </div>
        <Input
          label="Description"
          placeholder="Groceries, salary, utilities..."
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Amount"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register("amount")}
          />
          <Input
            label="Date"
            type="date"
            error={errors.transactionDate?.message}
            {...register("transactionDate")}
          />
        </div>
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Notes</span>
          <textarea
            className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60"
            placeholder="Optional context"
            {...register("notes")}
          />
          {errors.notes?.message ? (
            <span className="text-xs text-red-600">{errors.notes.message}</span>
          ) : null}
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save changes"
                : "Create transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
