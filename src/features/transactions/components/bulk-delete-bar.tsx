"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { bulkDeleteTransactions } from "@/features/transactions/actions/transactions.actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type BulkDeleteBarProps = Readonly<{
  selectedIds: string[];
  onClear: () => void;
}>;

export function BulkDeleteBar({ selectedIds, onClear }: BulkDeleteBarProps) {
  const [isPending, startTransition] = useTransition();

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <Modal
      open
      onClose={onClear}
      title={`Delete ${selectedIds.length} transaction${selectedIds.length > 1 ? "s" : ""}?`}
      description="This action cannot be undone."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClear} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await bulkDeleteTransactions(selectedIds);

              if (!result.success) {
                toast.error(result.error);
                return;
              }

              toast.success(`Deleted ${result.data.count} transactions.`);
              onClear();
            })
          }
          className="w-full sm:w-auto"
        >
          {isPending ? "Deleting..." : "Delete selected"}
        </Button>
      </div>
    </Modal>
  );
}
