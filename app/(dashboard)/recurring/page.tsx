import { RecurringPageClient } from "@/components/recurring/recurring-page-client";
import { getCategories } from "@/lib/actions/categories.actions";
import { getRecurringTransactions } from "@/lib/actions/recurring.actions";

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
