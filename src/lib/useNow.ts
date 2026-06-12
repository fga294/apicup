"use client";

import { useSyncExternalStore } from "react";

// One shared 1-second ticker for every countdown/clock on screen.
let nowMs = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      nowMs = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * Current time, ticking every second. Returns null during SSR/hydration so
 * server and client render identical markup (callers show a placeholder).
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => nowMs,
    () => null,
  );
}

const emptySubscribe = () => () => {};

/** False during SSR/hydration, true after — the canonical hydration detector. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
