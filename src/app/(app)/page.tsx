import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MatchCard } from "./matches/MatchCard";
import { WelcomeModal } from "@/components/WelcomeModal";
import { isOpenForPredictions } from "@/lib/competition";
import { getMatchesWithUserPrediction } from "@/lib/queries";
import { syncIfStale } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { welcome } = await searchParams;

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
      {welcome !== undefined && <WelcomeModal />}
      <h1 className="font-display text-4xl uppercase tracking-wide">
        Welcome back, {session.user.name} 👋
      </h1>
      <p className="mt-1 text-sm italic text-chalk-dim">
        Can humans outperform the machines?
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-chalk-dim">Your points</p>
          <p className="mt-1 text-3xl font-black text-gold-300 tabular-nums">
            {totalPoints}
          </p>
        </div>
        <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-chalk-dim">Predictions made</p>
          <p className="mt-1 text-3xl font-black tabular-nums">{predicted.length}</p>
        </div>
        <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-chalk-dim">Exact results</p>
          <p className="mt-1 text-3xl font-black text-limey-300 tabular-nums">
            {exactCount}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gold-300">
            {openUnpredicted.length > 0 ? "Waiting for your prediction" : "Predictions"}
          </h2>
          <Link href="/matches" className="text-sm text-chalk-dim hover:text-gold-300">
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
          <p className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-6 text-sm text-chalk-dim">
            Nothing open right now — you’re all caught up. New fixtures appear here
            automatically as teams qualify.
          </p>
        )}
      </section>
    </div>
  );
}
