import { getStatements } from "@/features/statements/actions/statements.actions";
import { StatementsPageClient } from "@/features/statements/components/statements-page-client";

export default async function StatementsPage() {
  const uploads = await getStatements();

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Statements</h1>
        <p className="text-sm text-slate-600">
          Import and review bank statement PDFs
        </p>
      </div>
      <StatementsPageClient uploads={uploads} />
    </section>
  );
}
