"use client";

import { Countdown } from "@/components/Countdown";
import { MovementChip } from "@/components/leaderboard/MovementChip";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import type { TvData } from "@/lib/stats";

const STAGE_SHORT: Record<string, string> = {
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "3RD",
  FINAL: "FINAL",
};

export function ScreenTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="mb-8 text-center">
      <p className="font-mono text-base uppercase tracking-[0.4em] text-gold-400">
        {kicker}
      </p>
      <h2 className="font-display text-6xl uppercase tracking-wide 2xl:text-7xl">
        {title}
      </h2>
    </header>
  );
}

const TROPHIES = ["🏆", "🥈", "🥉"] as const;

export function LeaderboardScreen({ data }: { data: TvData }) {
  const entries = data.leaderboard.slice(0, 8);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <ScreenTitle kicker="Live standings" title="Leaderboard" />
      <ol className="space-y-3">
        {entries.map((e, i) => (
          <li
            key={e.userId}
            className={`flex items-center gap-6 rounded-2xl border px-8 ${
              i === 0
                ? "champion-glow border-gold-400/60 bg-gold-400/10 py-5"
                : i === 1
                  ? "border-silver-400/40 bg-silver-400/5 py-4"
                  : i === 2
                    ? "border-bronze-400/40 bg-bronze-400/5 py-4"
                    : "border-chalk/8 bg-pitch-900/70 py-2.5"
            }`}
          >
            <span className={i === 0 ? "text-5xl" : i < 3 ? "text-4xl" : "w-12 text-right font-mono text-2xl text-chalk-dim"}>
              {i < 3 ? TROPHIES[i] : e.rank}
            </span>
            <span className={`min-w-0 truncate font-display uppercase tracking-wide ${i === 0 ? "text-5xl" : i < 3 ? "text-4xl" : "text-3xl"}`}>
              {e.displayName}
            </span>
            {e.isAi && (
              <span className="rounded border border-skyx-400/40 px-2 py-0.5 font-mono text-lg font-bold text-skyx-300">
                AI
              </span>
            )}
            {e.isGoldenPredictor && <span className="text-3xl">⭐</span>}
            <span aria-hidden className="mx-2 flex-1 border-b-2 border-dotted border-chalk/15" />
            <span className="scale-125">
              <MovementChip movement={e.movement} />
            </span>
            <span className={`font-display tabular-nums ${i === 0 ? "text-6xl text-gold-300" : i < 3 ? "text-5xl" : "text-4xl"}`}>
              {e.points}
              <span className="ml-2 text-xl text-chalk-dim">pts</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MoversColumn({
  title,
  entries,
  tone,
}: {
  title: string;
  entries: LeaderboardEntry[];
  tone: "up" | "down";
}) {
  return (
    <div className="flex-1">
      <h3
        className={`mb-4 text-center font-display text-4xl uppercase ${
          tone === "up" ? "text-limey-300" : "text-coral-300"
        }`}
      >
        {title}
      </h3>
      <ol className="space-y-3">
        {entries.length === 0 && (
          <p className="text-center text-2xl text-chalk-dim">No movement yet</p>
        )}
        {entries.map((e) => (
          <li
            key={e.userId}
            className="flex items-center gap-4 rounded-2xl border border-chalk/8 bg-pitch-900/70 px-6 py-4"
          >
            <span className={`font-display text-5xl tabular-nums ${tone === "up" ? "text-limey-300" : "text-coral-300"}`}>
              {tone === "up" ? "▲" : "▼"} {Math.abs(e.movement!)}
            </span>
            <span className="min-w-0 truncate font-display text-3xl uppercase">
              {e.displayName}
            </span>
            <span className="ml-auto font-mono text-2xl text-chalk-dim">
              now #{e.rank}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TopMoversScreen({ data }: { data: TvData }) {
  const moved = data.leaderboard.filter((e) => e.movement !== null && e.movement !== 0);
  const gainers = [...moved].sort((a, b) => b.movement! - a.movement!).slice(0, 3);
  const fallers = [...moved].sort((a, b) => a.movement! - b.movement!).slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <ScreenTitle kicker="Since the last results" title="Top movers" />
      <div className="flex gap-10">
        <MoversColumn title="Climbing" entries={gainers} tone="up" />
        <MoversColumn title="Falling" entries={fallers} tone="down" />
      </div>
    </div>
  );
}

export function AiVsHumansScreen({ data }: { data: TvData }) {
  const { ai, humans, bestHumanPoints, aiSlayerBadges } = data.stats;
  const aiEntry = data.leaderboard.find((e) => e.isAi);
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const humansLead = bestHumanPoints > ai.points;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <ScreenTitle kicker="The only question that matters" title="AI vs Humans" />
      <div className="flex items-stretch gap-8">
        <div className="flex-1 rounded-3xl border border-skyx-400/40 bg-skyx-400/5 p-10 text-center">
          <p className="text-7xl">🤖</p>
          <p className="mt-3 font-display text-4xl uppercase text-skyx-300">
            MQ-Chat: ModelOpus 4.8
          </p>
          <p className="mt-6 font-display text-8xl tabular-nums text-skyx-300">
            {ai.points}
            <span className="ml-2 text-2xl text-chalk-dim">pts</span>
          </p>
          <p className="mt-4 font-mono text-2xl text-chalk-dim">
            rank #{aiEntry?.rank ?? "—"} · hit rate {pct(ai.hitRate)} · exact {pct(ai.exactRate)}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="font-display text-6xl text-gold-400">VS</p>
        </div>
        <div className="flex-1 rounded-3xl border border-gold-400/40 bg-gold-400/5 p-10 text-center">
          <p className="text-7xl">🧠</p>
          <p className="mt-3 font-display text-4xl uppercase text-gold-300">The Humans</p>
          <p className="mt-6 font-display text-8xl tabular-nums text-gold-300">
            {bestHumanPoints}
            <span className="ml-2 text-2xl text-chalk-dim">best</span>
          </p>
          <p className="mt-4 font-mono text-2xl text-chalk-dim">
            hit rate {pct(humans.hitRate)} · exact {pct(humans.exactRate)} · 🤖 slain ×{aiSlayerBadges}
          </p>
        </div>
      </div>
      <p className="mt-10 text-center font-display text-5xl uppercase">
        {humansLead ? (
          <span className="text-gold-300">Humanity leads 🎉</span>
        ) : bestHumanPoints === ai.points ? (
          <span className="text-chalk-dim">Dead level…</span>
        ) : (
          <span className="text-skyx-300">The machine is winning 😱</span>
        )}
      </p>
    </div>
  );
}

export function UpcomingScreen({ data }: { data: TvData }) {
  const next = data.upcoming.slice(0, 4);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <ScreenTitle kicker="Get your predictions in" title="Upcoming matches" />
      {next.length === 0 ? (
        <p className="text-center text-3xl text-chalk-dim">
          No fixtures scheduled — check back soon.
        </p>
      ) : (
        <ol className="space-y-4">
          {next.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-6 rounded-2xl border border-chalk/8 bg-pitch-900/70 px-8 py-5"
            >
              <span className="rounded bg-chalk/10 px-3 py-1 font-mono text-xl font-bold text-gold-300">
                {STAGE_SHORT[m.stage] ?? m.stage}
              </span>
              <span className="min-w-0 flex-1 truncate text-center font-display text-4xl uppercase">
                {m.homeTeam ?? "TBD"} <span className="text-chalk-dim">v</span>{" "}
                {m.awayTeam ?? "TBD"}
              </span>
              <span className="text-right">
                <span className="block font-mono text-3xl">
                  <Countdown
                    cutoffIso={new Date(
                      new Date(m.kickoffUtc).getTime() - 3600_000,
                    ).toISOString()}
                  />
                </span>
                <span className="block font-mono text-lg text-chalk-dim">
                  {m.predictionsCount} prediction{m.predictionsCount === 1 ? "" : "s"} in
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function GoldenPredictorScreen({ data }: { data: TvData }) {
  const candidates = data.leaderboard
    .filter((e) => e.exactRate !== null && e.predictionsScored > 0)
    .sort(
      (a, b) =>
        b.exactRate! - a.exactRate! || b.exactCount - a.exactCount || b.points - a.points,
    )
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ScreenTitle kicker="Sharpest eye in the office" title="⭐ Golden Predictor" />
      {candidates.length === 0 ? (
        <p className="text-center text-3xl text-chalk-dim">
          No scored predictions yet — the title is up for grabs.
        </p>
      ) : (
        <ol className="space-y-3">
          {candidates.map((e, i) => (
            <li
              key={e.userId}
              className={`flex items-center gap-6 rounded-2xl border px-8 py-4 ${
                i === 0
                  ? "border-gold-400/60 bg-gold-400/10"
                  : "border-chalk/8 bg-pitch-900/70"
              }`}
            >
              <span className="font-display text-4xl">{i === 0 ? "⭐" : i + 1}</span>
              <span className="min-w-0 truncate font-display text-4xl uppercase">
                {e.displayName}
              </span>
              <span aria-hidden className="mx-2 flex-1 border-b-2 border-dotted border-chalk/15" />
              <span className={`font-display text-5xl tabular-nums ${i === 0 ? "text-gold-300" : ""}`}>
                {Math.round(e.exactRate! * 100)}%
              </span>
              <span className="w-44 text-right font-mono text-xl text-chalk-dim">
                {e.exactCount} exact / {e.predictionsScored}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function FunStatsScreen({ data }: { data: TvData }) {
  const s = data.stats;
  const tiles: [string, string][] = [
    ["Participants", String(s.totalParticipants)],
    ["Predictions made", String(s.totalPredictions)],
    ["Exact results", String(s.exactPredictions)],
    ["Favourite scoreline", s.popularScoreline ?? "—"],
    ["AI Slayer badges", String(s.aiSlayerBadges)],
    ["Matches played", `${s.finishedMatches}/${s.totalMatches}`],
  ];
  return (
    <div className="mx-auto w-full max-w-5xl">
      <ScreenTitle kicker="The tournament so far" title="Numbers game" />
      <div className="grid grid-cols-3 gap-6">
        {tiles.map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl border border-chalk/8 bg-pitch-900/70 p-8 text-center"
          >
            <p className="font-display text-7xl tabular-nums text-gold-300">{value}</p>
            <p className="mt-3 font-mono text-xl uppercase tracking-widest text-chalk-dim">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
