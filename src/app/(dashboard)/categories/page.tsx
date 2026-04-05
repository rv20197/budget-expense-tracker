import { CategoriesPageClient } from "@/features/categories/components/categories-page-client";
import { getCategories } from "@/features/categories/actions/categories.actions";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return <CategoriesPageClient categories={categories} />;
}
