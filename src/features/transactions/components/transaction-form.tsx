"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createTransaction,
  updateTransaction,
} from "@/features/transactions/actions/transactions.actions";
import {
  transactionSchema,
  type TransactionInput,
} from "@/features/transactions/schemas/finance.schemas";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

type AiSuggestion = {
  categoryId: string;
  categoryName: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

const confidenceStyles: Record<AiSuggestion["confidence"], string> = {
  high: "bg-green-50 border-green-200 text-green-800",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
  low: "bg-gray-50 border-gray-200 text-gray-600",
};

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
  const modalRef = useRef<HTMLFormElement>(null);
  const isEditing = Boolean(transaction);

  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
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
  const watchedDescription = useWatch({ control, name: "description" });
  const watchedAmount = useWatch({ control, name: "amount" });
  const categoryOptions = categories
    .filter((category) => category.type === selectedType)
    .map((category) => ({
      label: category.name,
      value: category.id,
    }));

  // Focus trapping and keyboard handling
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Focus first input when modal opens
  useEffect(() => {
    if (open && modalRef.current) {
      const firstInput = modalRef.current.querySelector('input, select, textarea') as HTMLElement;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  }, [open]);

  // Reset AI state when type changes
  useEffect(() => {
    setAiSuggestion(null);
    setAiDismissed(false);
    setAiLoading(false);
  }, [selectedType]);

  // Debounced AI categorization
  useEffect(() => {
    setAiSuggestion(null);
    setAiDismissed(false);

    if (!watchedDescription || watchedDescription.trim().length < 3) {
      setAiLoading(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    setAiLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: watchedDescription,
            amount: watchedAmount || undefined,
            type: selectedType,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestion: AiSuggestion | null };
        if (data.suggestion) {
          setAiSuggestion(data.suggestion);
        }
      } catch {
        // silently fail — category field remains fully manual
      } finally {
        setAiLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDescription, selectedType]);

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
      setAiSuggestion(null);
      setAiDismissed(false);
      onClose();
    });
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        setAiSuggestion(null);
        setAiDismissed(false);
        onClose();
      }}
      title={isEditing ? "Edit transaction" : "Add transaction"}
      description="Every transaction updates your reports, budgets, and dashboard."
    >
      <form ref={modalRef} className="flex flex-col h-full" onSubmit={onSubmit}>
        <div className="flex flex-col gap-4 flex-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  label="Type"
                  options={[
                    { label: "Expense", value: "expense" },
                    { label: "Income", value: "income" },
                  ]}
                  error={errors.type?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Category"
                  options={categoryOptions}
                  placeholder="Select category"
                  error={errors.categoryId?.message}
                  {...field}
                />
              )}
            />
          </div>
          <Input
            label="Description"
            placeholder="Groceries, salary, utilities..."
            error={errors.description?.message}
            {...register("description")}
          />

          {aiLoading && (
            <p className="text-xs text-gray-400 -mt-2">Suggesting category…</p>
          )}

          {!aiDismissed && aiSuggestion && !aiLoading && (
            <div
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs -mt-2 ${confidenceStyles[aiSuggestion.confidence]}`}
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium">Suggested: {aiSuggestion.categoryName}</span>
                <span className="opacity-70"> · {aiSuggestion.confidence} confidence</span>
                <p className="opacity-70 mt-0.5 truncate">{aiSuggestion.reason}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setValue("categoryId", aiSuggestion.categoryId, { shouldValidate: true });
                    setAiSuggestion(null);
                  }}
                  className="rounded px-2 py-1 font-medium hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-current"
                >
                  Apply
                </button>
                <button
                  type="button"
                  aria-label="Dismiss suggestion"
                  onClick={() => setAiDismissed(true)}
                  className="rounded px-1 py-1 opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-current"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
            <textarea
              className="w-full min-h-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
              placeholder="Optional context"
              {...register("notes")}
            />
            {errors.notes?.message ? (
              <span className="text-xs text-red-600 mt-1 block">{errors.notes.message}</span>
            ) : null}
          </label>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 mt-auto sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] sm:w-auto sm:px-6"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:w-auto sm:px-6"
          >
            {isPending
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save changes"
                : "Create transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
