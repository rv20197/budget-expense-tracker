import { redirect } from "next/navigation";

import { getHouseholdWithMembers } from "@/features/household/actions/getHousehold";
import { getSession } from "@/lib/auth/session";

export default async function HouseholdSettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const data = await getHouseholdWithMembers();

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">
          Household settings
        </h1>
        <p className="text-sm text-slate-600">
          Invite family members and review who shares this budget space.
        </p>
      </div>

      <article className="rounded-[28px] border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Household name</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {data.household?.name}
        </h2>
        <div className="mt-5 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Share this code with family</p>
          <p className="mt-2 text-3xl font-semibold tracking-[0.3em] text-slate-950">
            {data.household?.inviteCode}
          </p>
        </div>
      </article>

      <article className="rounded-[28px] border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">Members</h2>
        <div className="mt-4 grid gap-3">
          {data.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-950">{member.name}</p>
                <p className="text-sm text-slate-600">{member.email}</p>
              </div>
              <div className="text-sm text-slate-600 sm:text-right">
                <p className="font-medium uppercase tracking-[0.2em] text-slate-500">
                  {member.role}
                </p>
                <p>Joined {new Date(member.joinedAt).toISOString().slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
