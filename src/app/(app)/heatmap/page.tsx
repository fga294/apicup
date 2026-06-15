import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getHeatmap, type MatchSentiment } from "@/lib/heatmap";
import { STAGE_LABELS } from "@/lib/queries";

export const dynamic = "force-dynamic";

function outcomeOf(home: number, away: number): "home" | "draw" | "away" {
  if (home > away) return "home";
  if (home < away) return "away";
  return "draw";
}

/** A quiet 🤖 marker showing where the MQ-Chat AI contestant landed its pick. */
function AiPickMarker({
  pick,
  className = "",
}: {
  pick: { homeScore: number; awayScore: number };
  className?: string;
}) {
  const label = `MQ-Chat's pick: ${pick.homeScore}–${pick.awayScore}`;
  return (
    <span
      role="img"
      title={label}
      aria-label={label}
      className={`text-[10px] leading-none opacity-90 ${className}`}
    >
      🤖
    </span>
  );
}

function SentimentCard({ s }: { s: MatchSentiment }) {
  const pct = (n: number) => Math.round((n / s.total) * 100);
  const segments = [
    { key: "home", label: s.match.homeTeam ?? "Home", value: pct(s.homeWin), color: "bg-gold-400", text: "text-gold-300" },
    { key: "draw", label: "Draw", value: pct(s.draw), color: "bg-chalk/35", text: "text-chalk-dim" },
    { key: "away", label: s.match.awayTeam ?? "Away", value: pct(s.awayWin), color: "bg-coral-400", text: "text-coral-300" },
  ];
  const viewerOutcome = s.viewerPick
    ? outcomeOf(s.viewerPick.homeScore, s.viewerPick.awayScore)
    : null;
  const aiOutcome = s.aiPick ? outcomeOf(s.aiPick.homeScore, s.aiPick.awayScore) : null;
  // Seat the marker inside the bar when its segment is wide enough to hold a
  // glyph; otherwise fall back to the legend so bold minority picks still show.
  const aiSegment = aiOutcome ? segments.find((seg) => seg.key === aiOutcome) ?? null : null;
  const aiInBar = aiSegment !== null && aiSegment.value >= 15;
  const aiOutcomeText =
    aiOutcome === "draw" ? "a draw" : aiOutcome === "home" ? "a home win" : "an away win";
  const barLabel =
    `${segments[0].value}% home win, ${segments[1].value}% draw, ${segments[2].value}% away win` +
    (aiOutcome ? `; MQ-Chat predicts ${aiOutcomeText}` : "");
  const finished = s.match.status === "FINISHED" && s.match.homeScore90 !== null;

  return (
    <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl uppercase tracking-wide">
          {s.match.homeTeam} <span className="text-chalk-dim">v</span> {s.match.awayTeam}
        </h3>
        <span className="font-mono text-xs text-chalk-dim">
          {STAGE_LABELS[s.match.stage]}
          {finished && (
            <span className="ml-2 font-bold text-chalk">
              FT {s.match.homeScore90}–{s.match.awayScore90}
            </span>
          )}
        </span>
      </div>

      <div className="mt-4 flex h-7 overflow-hidden rounded-lg" role="img" aria-label={barLabel}>
        {segments.map(
          (seg) =>
            seg.value > 0 && (
              <div
                key={seg.key}
                style={{ width: `${seg.value}%` }}
                className={`${seg.color} flex items-center justify-center gap-1 font-mono text-[11px] font-bold text-pitch-950`}
              >
                {seg.value >= 12 && `${seg.value}%`}
                {aiInBar && seg.key === aiOutcome && s.aiPick && <AiPickMarker pick={s.aiPick} />}
              </div>
            ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {segments.map((seg) => (
          <span key={seg.key} className={`inline-flex items-center gap-1 font-semibold ${seg.text}`}>
            {seg.value}% {seg.key === "draw" ? "draw" : `${seg.label} win`}
            {!aiInBar && seg.key === aiOutcome && s.aiPick && <AiPickMarker pick={s.aiPick} />}
          </span>
        ))}
        <span className="ml-auto text-chalk-dim">
          {s.total} prediction{s.total === 1 ? "" : "s"}
        </span>
      </div>

      {s.viewerPick && (
        <p className="mt-3 rounded-lg bg-chalk/5 px-3 py-1.5 text-xs text-chalk-dim">
          Your pick:{" "}
          <span className="font-bold text-chalk">
            {s.viewerPick.homeScore}–{s.viewerPick.awayScore}
          </span>{" "}
          — {viewerOutcome === "draw" ? "a draw" : viewerOutcome === "home" ? `${s.match.homeTeam} win` : `${s.match.awayTeam} win`}
          {viewerOutcome === "home" && pct(s.homeWin) <= 25 && " · bold call! 🔥"}
          {viewerOutcome === "away" && pct(s.awayWin) <= 25 && " · bold call! 🔥"}
          {viewerOutcome === "draw" && pct(s.draw) <= 25 && " · bold call! 🔥"}
        </p>
      )}
    </div>
  );
}

export default async function HeatmapPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sentiments = await getHeatmap(session.user.userId);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        Prediction <span className="text-gold-400">heatmap</span>
      </h1>
      <p className="mt-1 text-sm text-chalk-dim">
        How the office is calling the next matches — live from the first
        prediction. Follow the crowd or back your own read. 🤖 marks MQ-Chat&apos;s
        pick.
      </p>

      {sentiments.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-chalk/10 bg-pitch-900/70 p-6 text-sm text-chalk-dim">
          No upcoming matches with predictions yet — check back once picks start
          coming in.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {sentiments.map((s) => (
            <SentimentCard key={s.match.id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
