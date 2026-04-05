import { RecurringPageClient } from "@/features/recurring/components/recurring-page-client";
import { getCategories } from "@/features/categories/actions/categories.actions";
import { getRecurringTransactions } from "@/features/recurring/actions/recurring.actions";

export default async function RecurringPage() {
  const [categories, recurring] = await Promise.all([
    getCategories(),
    getRecurringTransactions(),
  ]);

  return (
    <RecurringPageClient
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        type: category.type,
      }))}
      all={recurring.all}
      upcoming={recurring.upcoming}
    />
  );
}
