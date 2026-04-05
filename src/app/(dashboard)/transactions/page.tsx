import { getCategories } from "@/features/categories/actions/categories.actions";
import { getTransactions } from "@/features/transactions/actions/transactions.actions";
import { TransactionsPageClient } from "@/features/transactions/components/transactions-page-client";

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Transactions</h1>
          <p className="text-sm text-slate-600">Track and manage your financial transactions</p>
        </div>
      </div>

      <form className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:flex-wrap sm:p-5">
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none min-h-[44px] sm:flex-1"
          type="search"
          name="search"
          placeholder="Search description"
          defaultValue={search}
        />
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none min-h-[44px] sm:w-auto"
          name="type"
          defaultValue={type}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none min-h-[44px] sm:w-auto"
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
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none min-h-[44px] sm:w-auto"
          type="date"
          name="from"
          defaultValue={from}
        />
        <input
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none min-h-[44px] sm:w-auto"
          type="date"
          name="to"
          defaultValue={to}
        />
        <button
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white min-h-[44px] sm:w-auto sm:justify-self-start"
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
