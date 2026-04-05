import { redirect } from "next/navigation";

import { CreateHouseholdForm } from "@/features/household/components/CreateHouseholdForm";
import { JoinHouseholdForm } from "@/features/household/components/JoinHouseholdForm";
import { getSession } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.householdId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-500">
            Household Setup
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-4xl">
            Start sharing one family budget space.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Create a new household if you are setting things up for the first time,
            or join with an invite code from someone already in your family budget.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Shared data</p>
              <p className="mt-2 text-sm text-slate-600">
                Transactions and debts are visible to everyone in the household.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Personal space</p>
              <p className="mt-2 text-sm text-slate-600">
                Categories and budgets can still stay personal when needed.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Equal access</p>
              <p className="mt-2 text-sm text-slate-600">
                Every household member can edit and delete shared records.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              Create a household
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Set up a new shared budget space and invite the rest of the family later.
            </p>
            <div className="mt-6">
              <CreateHouseholdForm />
            </div>
          </article>

          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              Join with invite code
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Paste the code from a family member to join their existing household.
            </p>
            <div className="mt-6">
              <JoinHouseholdForm />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
