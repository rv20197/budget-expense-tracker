"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from "@/lib/actions/recurring.actions";
import {
  recurringTransactionSchema,
  type RecurringTransactionInput,
} from "@/lib/validations/finance.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

type RecurringItem = {
  id: string;
  categoryId: string;
  type: "income" | "expense";
  description: string;
  amount: string;
  frequency: "monthly" | "yearly";
  startDate: string;
  nextDueDate: string;
  isActive: boolean;
  notes: string | null;
};

type RecurringPageClientProps = Readonly<{
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense";
  }>;
  all: RecurringItem[];
  upcoming: RecurringItem[];
}>;

export function RecurringPageClient({
  categories,
  all,
  upcoming,
}: RecurringPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RecurringTransactionInput>({
    resolver: zodResolver(recurringTransactionSchema),
    values: editingItem
      ? {
          id: editingItem.id,
          categoryId: editingItem.categoryId,
          type: editingItem.type,
          description: editingItem.description,
          amount: editingItem.amount,
          frequency: editingItem.frequency,
          startDate: editingItem.startDate,
          nextDueDate: editingItem.nextDueDate,
          isActive: editingItem.isActive,
          notes: editingItem.notes ?? "",
        }
      : {
          categoryId: "",
          type: "expense",
          description: "",
          amount: "",
          frequency: "monthly",
          startDate: new Date().toISOString().slice(0, 10),
          nextDueDate: new Date().toISOString().slice(0, 10),
          isActive: true,
          notes: "",
        },
  });

  const selectedType = useWatch({ control, name: "type" });
  const categoryOptions = categories
    .filter((category) => category.type === selectedType)
    .map((category) => ({ label: category.name, value: category.id }));

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = editingItem
        ? await updateRecurringTransaction(editingItem.id, values)
        : await createRecurringTransaction(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        editingItem
          ? "Recurring transaction updated."
          : "Recurring transaction created.",
      );
      reset();
      setEditingItem(null);
      setIsModalOpen(false);
    });
  });

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            Recurring transactions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Automate repeating income and expense entries.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          Add recurring item
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-950">Upcoming 30 days</h3>
          <div className="mt-4 grid gap-3">
            {upcoming.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-950 truncate">{item.description}</p>
                    <p className="text-sm text-slate-600">
                      {item.frequency} due {item.nextDueDate}
                    </p>
                  </div>
                  <span className="font-semibold text-slate-950 shrink-0">
                    {item.amount}
                  </span>
                </div>
              </div>
            ))}
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-600">
                Nothing due in the next 30 days.
              </p>
            ) : null}
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-950">All recurring items</h3>
          <div className="mt-4 grid gap-3 max-h-96 overflow-y-auto">
            {all.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-950 truncate">{item.description}</p>
                  <p className="text-sm text-slate-600">
                    {item.type} • {item.frequency} • next {item.nextDueDate}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingItem(item);
                      setIsModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteRecurringTransaction(item.id);

                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }

                        toast.success("Recurring transaction deleted.");
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Modal
        open={isModalOpen}
        onClose={() => {
          setEditingItem(null);
          setIsModalOpen(false);
        }}
        title={editingItem ? "Edit recurring item" : "Add recurring item"}
        description="The cron worker will post due items into your transaction ledger."
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
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
            error={errors.description?.message}
            {...register("description")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount" error={errors.amount?.message} {...register("amount")} />
            <Select
              label="Frequency"
              options={[
                { label: "Monthly", value: "monthly" },
                { label: "Yearly", value: "yearly" },
              ]}
              error={errors.frequency?.message}
              {...register("frequency")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date"
              type="date"
              error={errors.startDate?.message}
              {...register("startDate")}
            />
            <Input
              label="Next due date"
              type="date"
              error={errors.nextDueDate?.message}
              {...register("nextDueDate")}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Saving..." : editingItem ? "Save changes" : "Create item"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
