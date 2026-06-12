"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

/**
 * Ticking countdown to a prediction cutoff. Renders a stable placeholder on
 * the server to avoid hydration mismatches, then ticks client-side.
 */
export function Countdown({ cutoffIso }: { cutoffIso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    return <span className="tabular-nums text-purple-300">—</span>;
  }

  const remaining = new Date(cutoffIso).getTime() - now;
  if (remaining <= 0) {
    return <span className="font-semibold text-rose-400">🔒 Locked</span>;
  }

  const urgent = remaining < 60 * 60 * 1000;
  return (
    <span
      className={`tabular-nums font-semibold ${
        urgent ? "animate-pulse text-rose-300" : "text-emerald-300"
      }`}
    >
      ⏳ {formatRemaining(remaining)}
    </span>
  );
}
