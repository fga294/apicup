import { Confetti } from "@/components/Confetti";
import { LeaderboardRows } from "@/components/leaderboard/LeaderboardRows";
import { getLeaderboard } from "@/lib/leaderboard";
import { syncIfStale } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await syncIfStale();
  const entries = await getLeaderboard();

  return (
    <div className="relative">
      <Confetti />
      <div className="relative z-10">
        <header className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-gold-400">
            The API Cup
          </p>
          <h1 className="font-display text-5xl uppercase tracking-wide sm:text-7xl">
            Leader<span className="text-gold-400">board</span>
          </h1>
          <p className="mt-2 text-sm italic text-chalk-dim">
            Can humans outperform the machines?
          </p>
        </header>

        <div className="mx-auto mt-8 max-w-3xl">
          <LeaderboardRows entries={entries} />
        </div>
      </div>
    </div>
  );
}
