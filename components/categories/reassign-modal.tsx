"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reassignCategoryTransactions } from "@/lib/actions/categories.actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

type ReassignModalProps = Readonly<{
  open: boolean;
  categoryId: string;
  options: Array<{ id: string; name: string }>;
  onClose: () => void;
}>;

export function ReassignModal({
  open,
  categoryId,
  options,
  onClose,
}: ReassignModalProps) {
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reassign transactions"
      description="Move existing transactions to another category before deleting this one."
    >
      <div className="grid gap-4">
        <Select
          label="Move transactions to"
          value={targetCategoryId}
          onChange={(event) => setTargetCategoryId(event.target.value)}
          options={options.map((option) => ({
            label: option.name,
            value: option.id,
          }))}
          placeholder="Select category"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            disabled={!targetCategoryId || isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await reassignCategoryTransactions(
                  categoryId,
                  targetCategoryId,
                );

                if (!result.success) {
                  toast.error(result.error);
                  return;
                }

                toast.success("Transactions reassigned and category deleted.");
                setTargetCategoryId("");
                onClose();
              })
            }
            className="w-full sm:w-auto"
          >
            {isPending ? "Reassigning..." : "Reassign and delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
