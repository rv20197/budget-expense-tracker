import { formatCurrency } from "@/lib/utils";

type DebtSummaryStripProps = Readonly<{
  totalDebt: string;
  totalLoan: string;
  overdueCount: number;
  dueSoonCount: number;
}>;

export function DebtSummaryStrip({
  totalDebt,
  totalLoan,
  overdueCount,
  dueSoonCount,
}: DebtSummaryStripProps) {
  const cards = [
    { label: "Total I Owe", value: formatCurrency(totalDebt) },
    { label: "Total Owed to Me", value: formatCurrency(totalLoan) },
    {
      label: "Overdue Payments",
      value: String(overdueCount),
      tone: overdueCount > 0 ? "text-red-600" : "text-slate-950",
    },
    {
      label: "Due in 7 Days",
      value: String(dueSoonCount),
      tone: dueSoonCount > 0 ? "text-amber-600" : "text-slate-950",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-[28px] border border-slate-200 bg-white p-5"
        >
          <p className="text-sm text-slate-500">{card.label}</p>
          <h2 className={`mt-2 text-3xl font-semibold ${card.tone ?? "text-slate-950"}`}>
            {card.value}
          </h2>
        </article>
      ))}
    </div>
  );
}
