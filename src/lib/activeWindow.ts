// When The API Cup should be "awake". Outside this window no games are played,
// so scores cannot change — the office TV stops polling and the backstop sync is
// paused, letting the Neon database autosuspend (scale to zero) overnight.
//
// Single source of truth, intentionally pure and isomorphic (no server-only
// imports) so the "use client" TV component and the GitHub cron schedule can
// both be reasoned about from these constants.

/** Games are tracked in the office's local time. */
export const ACTIVE_TZ = "Australia/Sydney";
/** First poll of the day — ~1 h before the earliest kickoff. */
export const ACTIVE_START_HOUR = 5; // 05:00 AEST
/** Last poll of the day — ~2 h after games typically finish (≈16:00 AEST). */
export const ACTIVE_END_HOUR = 18; // 18:00 AEST

/**
 * Wall-clock hour/minute/second in ACTIVE_TZ for the given instant. `h23` keeps
 * midnight as hour 0 (some environments report "24" with hour12:false).
 */
function tzParts(now: Date): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACTIVE_TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)!.value);
  return { hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** True between ACTIVE_START_HOUR (inclusive) and ACTIVE_END_HOUR (exclusive) in AEST. */
export function isWithinActiveWindow(now: Date = new Date()): boolean {
  const { hour } = tzParts(now);
  return hour >= ACTIVE_START_HOUR && hour < ACTIVE_END_HOUR;
}

/**
 * Milliseconds until the next ACTIVE_START_HOUR boundary in AEST. The idle TV
 * uses this to wake itself when the window reopens; callers re-check
 * isWithinActiveWindow() on wake, so an approximate value is fine.
 */
export function msUntilWindowOpens(now: Date = new Date()): number {
  const { hour, minute, second } = tzParts(now);
  const secondsIntoDay = hour * 3600 + minute * 60 + second;
  const target = ACTIVE_START_HOUR * 3600;
  const deltaSeconds =
    secondsIntoDay < target
      ? target - secondsIntoDay
      : 86_400 - secondsIntoDay + target;
  return deltaSeconds * 1000 - now.getMilliseconds();
}
