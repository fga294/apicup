"use client";

import { useActionState } from "react";

import {
  createManualMatch,
  issueResetCode,
  overrideResult,
  setProvider,
  submitAiPrediction,
  syncNow,
  type AdminActionState,
} from "./actions";

const initial: AdminActionState = {};

function Feedback({ state }: { state: AdminActionState }) {
  if (state.error)
    return (
      <p className="mt-1 text-xs text-coral-300" role="alert">
        {state.error}
      </p>
    );
  if (state.secret)
    return (
      <p className="mt-1 rounded bg-gold-400/10 px-2 py-1 font-mono text-xs text-gold-300">
        {state.secret}
      </p>
    );
  if (state.ok)
    return (
      <p className="mt-1 text-xs text-limey-300" role="status">
        Done ✓
      </p>
    );
  return null;
}

const inputCls =
  "w-14 rounded-lg border border-chalk/20 bg-chalk/10 py-1 text-center font-bold text-chalk outline-none focus:border-gold-400";
const buttonCls =
  "rounded-lg bg-gold-400 px-3 py-1 text-xs font-bold text-pitch-950 transition hover:bg-gold-300 disabled:opacity-50";

export function ResetCodeButton({ userId }: { userId: number }) {
  const [state, formAction, pending] = useActionState(issueResetCode, initial);
  return (
    <form action={formAction} className="text-right">
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "Issuing…" : "Issue reset code"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function AiPredictionForm({ matchId }: { matchId: number }) {
  const [state, formAction, pending] = useActionState(submitAiPrediction, initial);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <input name="homeScore" type="number" min={0} max={20} required aria-label="AI home score" className={inputCls} />
      <span className="text-chalk-dim">:</span>
      <input name="awayScore" type="number" min={0} max={20} required aria-label="AI away score" className={inputCls} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "Locking…" : "Lock AI pick"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function OverrideResultForm({ matchId }: { matchId: number }) {
  const [state, formAction, pending] = useActionState(overrideResult, initial);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <input name="homeScore90" type="number" min={0} max={20} required aria-label="Home 90-minute score" className={inputCls} />
      <span className="text-chalk-dim">:</span>
      <input name="awayScore90" type="number" min={0} max={20} required aria-label="Away 90-minute score" className={inputCls} />
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "Saving…" : "Set result + lock"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function ManualMatchForm() {
  const [state, formAction, pending] = useActionState(createManualMatch, initial);
  const fieldCls =
    "rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-1.5 text-sm text-chalk outline-none focus:border-gold-400";
  return (
    <form
      action={(fd) => {
        fd.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
        return formAction(fd);
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="text-xs text-chalk-dim">
        Stage
        <select name="stage" required className={`${fieldCls} mt-1 block`}>
          <option value="GROUP_STAGE">Group Stage (warm-up)</option>
          <option value="LAST_32">Round of 32</option>
          <option value="LAST_16">Round of 16</option>
          <option value="QUARTER_FINALS">Quarter Finals</option>
          <option value="SEMI_FINALS">Semi Finals</option>
          <option value="THIRD_PLACE">Third Place</option>
          <option value="FINAL">Final</option>
        </select>
      </label>
      <label className="text-xs text-chalk-dim">
        Home team
        <input name="homeTeam" required maxLength={40} className={`${fieldCls} mt-1 block`} />
      </label>
      <label className="text-xs text-chalk-dim">
        Away team
        <input name="awayTeam" required maxLength={40} className={`${fieldCls} mt-1 block`} />
      </label>
      <label className="text-xs text-chalk-dim">
        Kickoff (your local time)
        <input name="kickoffLocal" type="datetime-local" required className={`${fieldCls} mt-1 block`} />
      </label>
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "Adding…" : "Add match"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function ProviderForm({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState(setProvider, initial);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <select
        name="provider"
        defaultValue={current}
        className="rounded-lg border border-chalk/20 bg-chalk/10 px-3 py-1.5 text-sm text-chalk outline-none focus:border-gold-400"
      >
        <option value="football-data">football-data.org (automatic)</option>
        <option value="manual">Manual (admin-entered)</option>
      </select>
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "Saving…" : "Save"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function SyncNowButton() {
  const [state, formAction, pending] = useActionState(
    async () => syncNow(),
    initial,
  );
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "Syncing…" : "Sync now"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
