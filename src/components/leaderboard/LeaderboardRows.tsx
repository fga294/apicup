"use client";

import { motion } from "motion/react";

import type { LeaderboardEntry } from "@/lib/leaderboard";

import { MovementChip } from "./MovementChip";

const PODIUM = [
  {
    trophy: "🏆",
    trophySize: "text-5xl sm:text-6xl",
    name: "text-2xl sm:text-4xl",
    points: "text-3xl sm:text-5xl",
    frame:
      "champion-glow border-gold-400/60 bg-gradient-to-r from-gold-400/15 via-gold-400/5 to-transparent",
    accent: "text-gold-300",
  },
  {
    trophy: "🥈",
    trophySize: "text-4xl sm:text-5xl",
    name: "text-xl sm:text-3xl",
    points: "text-2xl sm:text-4xl",
    frame: "border-silver-400/40 bg-gradient-to-r from-silver-400/10 to-transparent",
    accent: "text-silver-300",
  },
  {
    trophy: "🥉",
    trophySize: "text-3xl sm:text-4xl",
    name: "text-lg sm:text-2xl",
    points: "text-xl sm:text-3xl",
    frame: "border-bronze-400/40 bg-gradient-to-r from-bronze-400/10 to-transparent",
    accent: "text-bronze-300",
  },
] as const;

function Badges({ entry }: { entry: LeaderboardEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {entry.isAi && (
        <span
          className="rounded border border-skyx-400/40 px-1.5 py-px font-mono text-[10px] font-bold tracking-wider text-skyx-300"
          title="AI contestant — competes in rankings, not eligible for prizes"
        >
          AI
        </span>
      )}
      {entry.isGoldenPredictor && (
        <span
          className="rounded border border-gold-400/50 bg-gold-400/10 px-1.5 py-px font-mono text-[10px] font-bold tracking-wider text-gold-300"
          title={`Golden Predictor — best exact-score rate (${Math.round((entry.exactRate ?? 0) * 100)}%)`}
        >
          ⭐ GOLDEN PREDICTOR
        </span>
      )}
      {entry.aiSlayerCount > 0 && (
        <span
          className="rounded border border-coral-400/40 bg-coral-400/10 px-1.5 py-px font-mono text-[10px] font-bold text-coral-300"
          title={`AI Slayer — beat the AI in ${entry.aiSlayerCount} completed stage${entry.aiSlayerCount === 1 ? "" : "s"}`}
        >
          🤖 ×{entry.aiSlayerCount}
        </span>
      )}
    </span>
  );
}

function PodiumRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const style = PODIUM[index];
  return (
    <motion.li
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.12, type: "spring", stiffness: 260, damping: 24 }}
      className={`relative overflow-hidden rounded-2xl border ${style.frame}`}
    >
      {index === 0 && <div className="gold-shimmer absolute inset-0" aria-hidden />}
      <div className="relative flex items-center gap-4 px-4 py-4 sm:gap-6 sm:px-7 sm:py-5">
        <span className={style.trophySize}>{style.trophy}</span>
        <div className="min-w-0">
          <p className={`font-display uppercase leading-none tracking-wide ${style.name}`}>
            {entry.displayName}
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-xs text-chalk-dim">
            <MovementChip movement={entry.movement} />
            <Badges entry={entry} />
          </p>
        </div>
        <div
          aria-hidden
          className="mx-1 hidden flex-1 border-b-2 border-dotted border-chalk/15 sm:block"
        />
        <div className="ml-auto text-right">
          <p className={`font-display tabular-nums ${style.points} ${style.accent}`}>
            {entry.points}
            <span className="ml-1 text-sm text-chalk-dim">pts</span>
          </p>
          <p className="font-mono text-xs text-chalk-dim" title="Exact scorelines — the points tie-breaker">
            {entry.exactCount} exact
          </p>
        </div>
      </div>
    </motion.li>
  );
}

function StandardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.36 + index * 0.05 }}
      className="flex items-center gap-3 rounded-xl border border-chalk/8 bg-pitch-900/70 px-4 py-2.5 sm:gap-4"
    >
      <span className="w-8 text-right font-mono text-sm font-bold text-chalk-dim">
        {entry.rank}
      </span>
      <p className="min-w-0 truncate font-semibold">
        {entry.displayName} <Badges entry={entry} />
      </p>
      <div
        aria-hidden
        className="mx-1 hidden flex-1 border-b border-dotted border-chalk/10 sm:block"
      />
      <MovementChip movement={entry.movement} />
      <p
        className="text-right font-mono tabular-nums"
        title="Exact scorelines — the points tie-breaker"
      >
        <span className="text-lg font-bold">{entry.points}</span>
        <span className="ml-1 text-xs text-chalk-dim">pts</span>
        <span className="ml-2 text-xs font-normal text-chalk-dim">
          · {entry.exactCount} exact
        </span>
      </p>
    </motion.li>
  );
}

export function LeaderboardRows({ entries }: { entries: LeaderboardEntry[] }) {
  const podium = entries.filter((e) => e.rank <= 3).slice(0, 3);
  const rest = entries.filter((e) => !podium.includes(e));

  return (
    <div>
      <ol className="space-y-3">
        {podium.map((entry, i) => (
          <PodiumRow key={entry.userId} entry={entry} index={i} />
        ))}
      </ol>
      <ol className="mt-5 space-y-2">
        {rest.map((entry, i) => (
          <StandardRow key={entry.userId} entry={entry} index={i} />
        ))}
      </ol>
    </div>
  );
}
