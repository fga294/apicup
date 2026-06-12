import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LocalKickoff } from "@/components/LocalKickoff";
import { getSnapshotHistory } from "@/lib/heatmap";
import { getTvData } from "@/lib/stats";

export const dynamic = "force-dynamic";

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-5 text-center">
      <p className={`font-display text-4xl tabular-nums ${accent ?? "text-chalk"}`}>{value}</p>
      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-chalk-dim">
        {label}
      </p>
    </div>
  );
}

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [data, history] = await Promise.all([getTvData(), getSnapshotHistory()]);
  const { stats, leaderboard } = data;

  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const topScorer = leaderboard.find((e) => e.rank === 1);
  const goldenPredictor = leaderboard.find((e) => e.isGoldenPredictor);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        Tournament <span className="text-gold-400">stats</span>
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Participants" value={String(stats.totalParticipants)} />
        <StatTile label="Predictions" value={String(stats.totalPredictions)} />
        <StatTile label="Exact results" value={String(stats.exactPredictions)} accent="text-limey-300" />
        <StatTile label="AI Slayer badges" value={String(stats.aiSlayerBadges)} accent="text-coral-300" />
        <StatTile
          label="Top scorer"
          value={topScorer ? topScorer.displayName : "—"}
          accent="text-gold-300"
        />
        <StatTile
          label="Golden Predictor"
          value={goldenPredictor ? goldenPredictor.displayName : "—"}
          accent="text-gold-300"
        />
        <StatTile label="Favourite scoreline" value={stats.popularScoreline ?? "—"} />
        <StatTile
          label="Matches played"
          value={`${stats.finishedMatches}/${stats.totalMatches}`}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gold-300">
          AI vs Humans
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-skyx-400/30 bg-skyx-400/5 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-skyx-300">
              🤖 MQ-Chat: ModelOpus 4.8
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-3xl tabular-nums text-skyx-300">{stats.ai.points}</p>
                <p className="text-[11px] text-chalk-dim">points</p>
              </div>
              <div>
                <p className="font-display text-3xl tabular-nums text-skyx-300">{pct(stats.ai.hitRate)}</p>
                <p className="text-[11px] text-chalk-dim">hit rate</p>
              </div>
              <div>
                <p className="font-display text-3xl tabular-nums text-skyx-300">{pct(stats.ai.exactRate)}</p>
                <p className="text-[11px] text-chalk-dim">exact rate</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-gold-300">
              🧠 The humans (combined)
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-3xl tabular-nums text-gold-300">{stats.bestHumanPoints}</p>
                <p className="text-[11px] text-chalk-dim">best score</p>
              </div>
              <div>
                <p className="font-display text-3xl tabular-nums text-gold-300">{pct(stats.humans.hitRate)}</p>
                <p className="text-[11px] text-chalk-dim">hit rate</p>
              </div>
              <div>
                <p className="font-display text-3xl tabular-nums text-gold-300">{pct(stats.humans.exactRate)}</p>
                <p className="text-[11px] text-chalk-dim">exact rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gold-300">
          Leaderboard recalculations
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-dim">None yet — first results pending.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-lg border border-chalk/8 bg-pitch-900/70 px-4 py-2 font-mono text-xs text-chalk-dim"
              >
                <LocalKickoff kickoffIso={h.takenAt.toISOString()} />
                <span className="text-chalk/70">·</span>
                <span className="truncate">{h.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
