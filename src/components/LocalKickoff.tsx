"use client";

import { useEffect, useState } from "react";

/** Kickoff time in the viewer's timezone; server renders UTC as fallback. */
export function LocalKickoff({ kickoffIso }: { kickoffIso: string }) {
  const [label, setLabel] = useState(() =>
    new Date(kickoffIso).toISOString().slice(0, 16).replace("T", " ") + " UTC",
  );

  useEffect(() => {
    setLabel(
      new Date(kickoffIso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [kickoffIso]);

  return <time suppressHydrationWarning dateTime={kickoffIso}>{label}</time>;
}
