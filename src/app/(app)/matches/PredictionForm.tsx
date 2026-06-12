"use client";

import { useActionState } from "react";

import { submitPrediction, type PredictState } from "./actions";

const initialState: PredictState = {};

export function PredictionForm({ matchId }: { matchId: number }) {
  const [state, formAction, pending] = useActionState(submitPrediction, initialState);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="matchId" value={matchId} />
      <div className="flex items-center justify-center gap-2">
        <input
          name="homeScore"
          type="number"
          min={0}
          max={20}
          required
          aria-label="Home score"
          className="w-14 rounded-lg border border-white/20 bg-white/10 py-1.5 text-center text-lg font-bold text-white outline-none focus:border-amber-400"
        />
        <span className="text-purple-300">:</span>
        <input
          name="awayScore"
          type="number"
          min={0}
          max={20}
          required
          aria-label="Away score"
          className="w-14 rounded-lg border border-white/20 bg-white/10 py-1.5 text-center text-lg font-bold text-white outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-bold text-amber-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          {pending ? "Locking…" : "Lock it in"}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-purple-400">
        One shot — predictions can’t be changed.
      </p>
      {state.error && (
        <p className="mt-1 text-center text-xs text-rose-300" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
