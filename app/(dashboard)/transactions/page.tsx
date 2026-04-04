import { getCategories } from "@/lib/actions/categories.actions";
import { getTransactions } from "@/lib/actions/transactions.actions";
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client";

type TransactionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = (await searchParams) ?? {};
  const page = Number(params.page ?? 1);
  const categoryId =
    typeof params.categoryId === "string" ? params.categoryId : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const sortBy =
    typeof params.sortBy === "string" &&
    ["description", "categoryName", "transactionDate", "amount"].includes(params.sortBy)
      ? params.sortBy as "description" | "categoryName" | "transactionDate" | "amount"
      : undefined;
  const sortOrder =
    typeof params.sortOrder === "string" &&
    ["asc", "desc"].includes(params.sortOrder)
      ? params.sortOrder as "asc" | "desc"
      : undefined;

  const [categories, transactionData] = await Promise.all([
    getCategories(),
    getTransactions({
      page,
      categoryId,
      type: type === "income" || type === "expense" ? type : undefined,
      search,
      from,
      to,
      sortBy,
      sortOrder,
    }),
  ]);

  const exportParams = new URLSearchParams();
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);

  return (
    <section className="grid gap-6">
      <form className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:grid-cols-5">
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          type="search"
          name="search"
          placeholder="Search description"
          defaultValue={search}
        />
        <select
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          name="type"
          defaultValue={type}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          name="categoryId"
          defaultValue={categoryId}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          type="date"
          name="from"
          defaultValue={from}
        />
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
          type="date"
          name="to"
          defaultValue={to}
        />
        <button
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white md:col-span-5 md:justify-self-start"
          type="submit"
        >
          Apply filters
        </button>
      </form>
      <TransactionsPageClient
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
        }))}
        items={transactionData.items}
        total={transactionData.total}
        page={transactionData.page}
        pageSize={transactionData.pageSize}
        sortBy={sortBy}
        sortOrder={sortOrder}
        exportHref={`/api/transactions/export?${exportParams.toString()}`}
      />
    </section>
  );
}
