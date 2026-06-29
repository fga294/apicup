"use client";

import { Countdown } from "@/components/Countdown";
import { MovementChip } from "@/components/leaderboard/MovementChip";
import type { TvData } from "@/lib/stats";

const STAGE_SHORT: Record<string, string> = {
  GROUP_STAGE: "GRP",
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
            <span className="text-right">
              <span className={`block font-display tabular-nums ${i === 0 ? "text-6xl text-gold-300" : i < 3 ? "text-5xl" : "text-4xl"}`}>
                {e.points}
                <span className="ml-2 text-xl text-chalk-dim">pts</span>
              </span>
              <span className="block font-mono text-base text-chalk-dim">
                {e.exactCount} exact
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const PILL_TONES = {
  ai: "text-skyx-300",
  humans: "text-gold-300",
  slain: "text-coral-300",
} as const;

// Subtle inline pill: a caption to the hero points, not a competing module.
// Neutral chip (the box border/title already signal the side); dim label,
// small colored value with tabular figures so polling doesn't shift width.
function StatPill({
  tone,
  label,
  value,
}: {
  tone: keyof typeof PILL_TONES;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-2 rounded-full border border-chalk/10 bg-chalk/5 px-4 py-1.5">
      <span className="font-mono text-sm uppercase tracking-[0.18em] text-chalk-dim">{label}</span>
      <span className={`font-mono text-xl font-semibold tabular-nums ${PILL_TONES[tone]}`}>{value}</span>
    </span>
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
            MQ-Chat (Opus 4.8)
          </p>
          <p className="mt-6 font-display text-8xl tabular-nums text-skyx-300">
            {ai.points}
            <span className="ml-2 text-2xl text-chalk-dim">pts</span>
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <StatPill tone="ai" label="Rank" value={`#${aiEntry?.rank ?? "—"}`} />
            <StatPill tone="ai" label="Hit rate" value={pct(ai.hitRate)} />
            <StatPill tone="ai" label="Exact" value={pct(ai.exactRate)} />
          </div>
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
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <StatPill tone="humans" label="Hit rate" value={pct(humans.hitRate)} />
            <StatPill tone="humans" label="Exact" value={pct(humans.exactRate)} />
            <StatPill tone="slain" label="Slain" value={`×${aiSlayerBadges}`} />
          </div>
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

function SentimentBar({ match }: { match: TvData["upcoming"][number] }) {
  if (match.predictionsCount === 0) return null;
  const pct = (n: number) => Math.round((n / match.predictionsCount) * 100);
  const segments = [
    { key: "home", label: match.homeTeam ?? "Home", value: pct(match.homeWinPicks), color: "bg-gold-400" },
    { key: "draw", label: "Draw", value: pct(match.drawPicks), color: "bg-chalk/35" },
    { key: "away", label: match.awayTeam ?? "Away", value: pct(match.awayWinPicks), color: "bg-coral-400" },
  ];
  return (
    <div className="mt-3">
      <div
        className="flex h-6 overflow-hidden rounded-md"
        role="img"
        aria-label={`Crowd: ${segments[0].value}% home win, ${segments[1].value}% draw, ${segments[2].value}% away win`}
      >
        {segments.map(
          (seg) =>
            seg.value > 0 && (
              <div
                key={seg.key}
                style={{ width: `${seg.value}%` }}
                className={`${seg.color} flex items-center justify-center font-mono text-sm font-bold text-pitch-950`}
              >
                {seg.value >= 10 && `${seg.value}%`}
              </div>
            ),
        )}
      </div>
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
        <ol className="space-y-3">
          {next.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-chalk/8 bg-pitch-900/70 px-8 py-4"
            >
              <div className="flex items-center gap-6">
                <span className="rounded bg-chalk/10 px-3 py-1 font-mono text-xl font-bold text-gold-300">
                  {STAGE_SHORT[m.stage] ?? m.stage}
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-3 font-display text-4xl uppercase">
                  {m.homeCrestUrl && (
                    // National-team crest from the data provider.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.homeCrestUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 object-contain"
                    />
                  )}
                  <span className="truncate">{m.homeTeam ?? "TBD"}</span>
                  <span className="shrink-0 text-chalk-dim">v</span>
                  <span className="truncate">{m.awayTeam ?? "TBD"}</span>
                  {m.awayCrestUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.awayCrestUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 object-contain"
                    />
                  )}
                </div>
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
              </div>
              <SentimentBar match={m} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function GoldenPredictorScreen({ data }: { data: TvData }) {
  // Merged view (absorbs the former standalone "Exact Score" screen): ranks
  // players by how many exact scorelines they've nailed (volume), then by
  // exact-score rate, then points — and shows both the count (🎯) and the
  // rate (%). Note the ⭐ badge on the Leaderboard still tracks the best *rate*,
  // so the leader here can differ from that badge holder.
  const ranked = data.leaderboard
    .filter((e) => e.exactCount > 0)
    .sort(
      (a, b) =>
        b.exactCount - a.exactCount ||
        (b.exactRate ?? 0) - (a.exactRate ?? 0) ||
        b.points - a.points,
    )
    .slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ScreenTitle kicker="Most exact scorelines nailed" title="⭐ Golden Predictor" />
      {ranked.length === 0 ? (
        <div className="rounded-3xl border border-chalk/8 bg-pitch-900/70 px-10 py-20 text-center">
          <p className="animate-pulse text-9xl">🎯</p>
          <p className="mt-8 font-display text-5xl uppercase tracking-wide">No bullseyes yet</p>
          <p className="mt-4 font-mono text-2xl text-chalk-dim">
            Nail an exact scoreline to claim the crown.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {ranked.map((e, i) => (
            <li
              key={e.userId}
              className={`flex items-center gap-6 rounded-2xl border px-8 py-4 ${
                i === 0
                  ? "champion-glow border-gold-400/60 bg-gold-400/10"
                  : "border-chalk/8 bg-pitch-900/70"
              }`}
            >
              <span
                className={`w-14 text-center font-display tabular-nums ${
                  i === 0 ? "text-5xl" : "text-4xl text-chalk-dim"
                }`}
              >
                {i === 0 ? "🎯" : i + 1}
              </span>
              <span className="min-w-0 truncate font-display text-4xl uppercase">
                {e.displayName}
              </span>
              {e.isAi && (
                <span className="rounded border border-skyx-400/40 px-2 py-0.5 font-mono text-lg font-bold text-skyx-300">
                  AI
                </span>
              )}
              <span aria-hidden className="mx-2 flex-1 border-b-2 border-dotted border-chalk/15" />
              <span
                className={`font-display text-6xl tabular-nums ${
                  i === 0 ? "text-gold-300" : "text-gold-400"
                }`}
              >
                {e.exactCount}
                <span className="ml-2 text-3xl">🎯</span>
              </span>
              <span className="w-44 text-right font-mono text-lg text-chalk-dim">
                {Math.round(e.exactRate! * 100)}% rate
                <span className="block">of {e.predictionsScored} scored</span>
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
