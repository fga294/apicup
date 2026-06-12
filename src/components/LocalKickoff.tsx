"use client";

import { useHydrated } from "@/lib/useNow";

/** Kickoff time in the viewer's timezone; server renders UTC as fallback. */
export function LocalKickoff({ kickoffIso }: { kickoffIso: string }) {
  const hydrated = useHydrated();

  const label = hydrated
    ? new Date(kickoffIso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(kickoffIso).toISOString().slice(0, 16).replace("T", " ") + " UTC";

  return (
    <time suppressHydrationWarning dateTime={kickoffIso}>
      {label}
    </time>
  );
}
