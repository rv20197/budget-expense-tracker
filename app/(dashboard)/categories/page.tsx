import { CategoriesPageClient } from "@/components/categories/categories-page-client";
import { getCategories } from "@/lib/actions/categories.actions";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return <CategoriesPageClient categories={categories} />;
}
