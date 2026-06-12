import { Countdown } from "@/components/Countdown";
import { LocalKickoff } from "@/components/LocalKickoff";
import { isOpenForPredictions, predictionCutoff } from "@/lib/competition";
import type { MatchWithPrediction } from "@/lib/queries";

import { PredictionForm } from "./PredictionForm";

function Team({
  name,
  code,
  crest,
}: {
  name: string | null;
  code: string | null;
  crest: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      {crest ? (
        // Tiny provider-hosted SVGs; next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt="" className="h-10 w-10 object-contain" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center text-2xl">❓</span>
      )}
      <span className="text-center text-sm font-semibold leading-tight">
        {name ?? "TBD"}
      </span>
      {code && <span className="text-[10px] text-purple-400">{code}</span>}
    </div>
  );
}

export function MatchCard({ match, prediction }: MatchWithPrediction) {
  const open = isOpenForPredictions(match);
  const finished = match.status === "FINISHED" && match.homeScore90 !== null;
  const live = match.status === "IN_PLAY" || match.status === "PAUSED";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
      <div className="flex items-center justify-between text-xs text-purple-300">
        <LocalKickoff kickoffIso={match.kickoffUtc.toISOString()} />
        {live && (
          <span className="animate-pulse rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">
            ● LIVE
          </span>
        )}
        {!finished && !live && (
          <Countdown cutoffIso={predictionCutoff(match.kickoffUtc).toISOString()} />
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Team name={match.homeTeam} code={match.homeTeamCode} crest={match.homeCrestUrl} />
        <div className="px-2 text-center">
          {finished ? (
            <span className="text-2xl font-black tabular-nums">
              {match.homeScore90}–{match.awayScore90}
            </span>
          ) : (
            <span className="text-lg font-bold text-purple-400">vs</span>
          )}
        </div>
        <Team name={match.awayTeam} code={match.awayTeamCode} crest={match.awayCrestUrl} />
      </div>

      {prediction ? (
        <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-center text-sm">
          <span className="text-purple-300">Your pick: </span>
          <span className="font-bold tabular-nums">
            {prediction.homeScore}–{prediction.awayScore}
          </span>
          {prediction.points !== null && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-black ${
                prediction.points === 10
                  ? "bg-amber-400/20 text-amber-300"
                  : prediction.points === 5
                    ? "bg-emerald-400/20 text-emerald-300"
                    : "bg-white/10 text-purple-300"
              }`}
            >
              +{prediction.points} pts
            </span>
          )}
        </div>
      ) : open ? (
        <PredictionForm matchId={match.id} />
      ) : (
        <p className="mt-3 text-center text-xs text-purple-400">
          {match.homeTeam
            ? finished || live
              ? "Predictions closed"
              : "🔒 Predictions closed"
            : "Opens when both teams are known"}
        </p>
      )}
    </div>
  );
}
