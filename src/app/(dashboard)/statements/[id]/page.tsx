import { notFound } from "next/navigation";

import {
  getStatementById,
  getStatementTransactions,
} from "@/features/statements/actions/statements.actions";
import { StatementTransactionsView } from "@/features/statements/components/statement-transactions-view";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StatementTransactionsPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const page = Math.max(1, Number(sp.page ?? 1));
  const categoryId = typeof sp.categoryId === "string" ? sp.categoryId : undefined;
  const type =
    typeof sp.type === "string" && (sp.type === "income" || sp.type === "expense")
      ? sp.type
      : undefined;
  const dateFrom = typeof sp.dateFrom === "string" ? sp.dateFrom : undefined;
  const dateTo = typeof sp.dateTo === "string" ? sp.dateTo : undefined;
  const lowConfidenceOnly = sp.lowConfidence === "true";

  const [upload, transactionData] = await Promise.all([
    getStatementById(id),
    getStatementTransactions(id, {
      page,
      limit: 50,
      categoryId,
      type,
      dateFrom,
      dateTo,
      lowConfidenceOnly,
    }),
  ]);

  if (!upload) notFound();

  return (
    <section className="grid gap-6">
      <div>
        <a
          href="/statements"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to Statements
        </a>
      </div>
      <StatementTransactionsView
        uploadId={id}
        upload={upload}
        items={transactionData.items}
        total={transactionData.total}
        page={transactionData.page}
        totalPages={transactionData.totalPages}
        categories={transactionData.categories}
      />
    </section>
  );
}
