import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MatchCard } from "./matches/MatchCard";
import { isOpenForPredictions } from "@/lib/competition";
import { getMatchesWithUserPrediction } from "@/lib/queries";
import { syncIfStale } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await syncIfStale();
  const rows = await getMatchesWithUserPrediction(session.user.userId);

  const predicted = rows.filter((r) => r.prediction !== null);
  const totalPoints = predicted.reduce((sum, r) => sum + (r.prediction?.points ?? 0), 0);
  const exactCount = predicted.filter((r) => r.prediction?.points === 10).length;
  const openUnpredicted = rows
    .filter((r) => !r.prediction && isOpenForPredictions(r.match))
    .slice(0, 3);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight">
        Welcome back, {session.user.name} 👋
      </h1>
      <p className="mt-1 text-sm italic text-purple-300">
        Can humans outperform the machines?
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-purple-300">Your points</p>
          <p className="mt-1 text-3xl font-black text-amber-300 tabular-nums">
            {totalPoints}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-purple-300">Predictions made</p>
          <p className="mt-1 text-3xl font-black tabular-nums">{predicted.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-purple-300">Exact results</p>
          <p className="mt-1 text-3xl font-black text-emerald-300 tabular-nums">
            {exactCount}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-amber-300">
            {openUnpredicted.length > 0 ? "Waiting for your prediction" : "Predictions"}
          </h2>
          <Link href="/matches" className="text-sm text-purple-300 hover:text-amber-300">
            All matches →
          </Link>
        </div>
        {openUnpredicted.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openUnpredicted.map((row) => (
              <MatchCard key={row.match.id} {...row} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-purple-300">
            Nothing open right now — you’re all caught up. New fixtures appear here
            automatically as teams qualify.
          </p>
        )}
      </section>
    </div>
  );
}
