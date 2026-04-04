"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/categories.actions";
import {
  categorySchema,
  type CategoryInput,
} from "@/lib/validations/finance.schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ReassignModal } from "@/components/categories/reassign-modal";
import { generateRandomHexColor } from "@/lib/utils";

type CategoryRow = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  isDefault: boolean;
};

type CategoriesPageClientProps = Readonly<{
  categories: CategoryRow[];
}>;

export function CategoriesPageClient({
  categories,
}: CategoriesPageClientProps) {
  const [tab, setTab] = useState<"income" | "expense">("expense");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [reassignCategory, setReassignCategory] = useState<CategoryRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: tab,
      color: generateRandomHexColor(),
    },
  });

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    if (editingCategory) {
      reset({
        name: editingCategory.name,
        type: editingCategory.type,
        color: editingCategory.color,
      });
      return;
    }

    reset({
      name: "",
      type: tab,
      color: generateRandomHexColor(),
    });
  }, [editingCategory, isModalOpen, reset, tab]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === tab),
    [categories, tab],
  );

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = editingCategory
        ? await updateCategory(editingCategory.id, values)
        : await createCategory(values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        editingCategory ? "Category updated." : "Category created.",
      );
      setEditingCategory(null);
      setIsModalOpen(false);
      reset({
        name: "",
        type: tab,
        color: generateRandomHexColor(),
      });
    });
  });

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Categories</h2>
          <p className="mt-1 text-sm text-slate-600">
            Organize how income and expense activity gets grouped.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            reset({
              name: "",
              type: tab,
              color: generateRandomHexColor(),
            });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          Add category
        </Button>
      </div>
      <div className="inline-flex rounded-2xl bg-slate-100 p-1">
        {(["expense", "income"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`flex-1 sm:flex-none rounded-2xl px-4 py-2 text-sm font-medium transition ${
              tab === value
                ? "bg-white text-slate-950 shadow"
                : "text-slate-600"
            }`}
            onClick={() => setTab(value)}
          >
            {value === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredCategories.map((category) => (
          <article
            key={category.id}
            className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <span
                  className="inline-block h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-950 truncate">{category.name}</h3>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Badge
                      variant={category.type === "income" ? "success" : "neutral"}
                    >
                      {category.type}
                    </Badge>
                    {category.isDefault ? (
                      <Badge variant="warning">Default</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingCategory(category);
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
                      const result = await deleteCategory(category.id);

                      if (!result.success) {
                        if (result.error.includes("Reassign")) {
                          setReassignCategory(category);
                          return;
                        }
                        toast.error(result.error);
                        return;
                      }

                      toast.success("Category deleted.");
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Modal
        open={isModalOpen}
        onClose={() => {
          setEditingCategory(null);
          setIsModalOpen(false);
          reset({
            name: "",
            type: tab,
            color: generateRandomHexColor(),
          });
        }}
        title={editingCategory ? "Edit category" : "Add category"}
        description="Categories drive filters, charts, budgets, and recurring items."
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input
            label="Name"
            placeholder="Food, Salary, Freelance..."
            error={errors.name?.message}
            {...register("name")}
          />
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
            <Input
              label="Color"
              placeholder="#a1b2c3"
              error={errors.color?.message}
              {...register("color")}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending
                ? "Saving..."
                : editingCategory
                  ? "Save changes"
                  : "Create category"}
            </Button>
          </div>
        </form>
      </Modal>
      <ReassignModal
        open={Boolean(reassignCategory)}
        categoryId={reassignCategory?.id ?? ""}
        options={filteredCategories
          .filter((category) => category.id !== reassignCategory?.id)
          .map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        onClose={() => setReassignCategory(null)}
      />
    </section>
  );
}
