"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { Confetti } from "@/components/Confetti";
import { JoinQr } from "@/components/JoinQr";
import type { TvData } from "@/lib/stats";
import { useNow } from "@/lib/useNow";

import {
  AiVsHumansScreen,
  FunStatsScreen,
  GoldenPredictorScreen,
  LeaderboardScreen,
  TopMoversScreen,
  UpcomingScreen,
} from "./screens";

const SCREEN_SECONDS = 12;
const POLL_SECONDS = 45;

const SCREENS = [
  { name: "Leaderboard", component: LeaderboardScreen },
  { name: "Top movers", component: TopMoversScreen },
  { name: "AI vs Humans", component: AiVsHumansScreen },
  { name: "Upcoming", component: UpcomingScreen },
  { name: "Golden Predictor", component: GoldenPredictorScreen },
  { name: "Stats", component: FunStatsScreen },
] as const;

function Clock() {
  const now = useNow();
  return (
    <span className="font-mono text-2xl tabular-nums text-chalk-dim">
      {now !== null
        ? new Date(now).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--"}
    </span>
  );
}

export function TvApp({ initial, loginUrl }: { initial: TvData; loginUrl: string }) {
  const [data, setData] = useState(initial);
  const [screenIndex, setScreenIndex] = useState(0);

  // Rotate screens.
  useEffect(() => {
    const t = setInterval(
      () => setScreenIndex((i) => (i + 1) % SCREENS.length),
      SCREEN_SECONDS * 1000,
    );
    return () => clearInterval(t);
  }, []);

  // Poll fresh data; the endpoint also lazily syncs results during matches.
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/tv", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } catch {
        // Keep showing the last good data; next poll will retry.
      }
    }, POLL_SECONDS * 1000);
    return () => clearInterval(t);
  }, []);

  const Screen = SCREENS[screenIndex].component;

  // Confetti is reserved for the celebratory screens; the rest stay calm.
  const CONFETTI_SCREENS = new Set(["Leaderboard", "Golden Predictor"]);
  const showConfetti = CONFETTI_SCREENS.has(SCREENS[screenIndex].name);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {showConfetti && <Confetti />}
      <JoinQr url={loginUrl} />

      <header className="relative z-10 flex items-center gap-4 px-10 pt-6">
        <span className="text-4xl">🥇</span>
        <div>
          <p className="font-display text-3xl uppercase leading-none tracking-wide">
            The API Cup
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-400">
            Artificial Prediction Intelligence
          </p>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <span className="hidden font-mono text-lg text-chalk-dim xl:inline">
            Join in: predict, compete, beat the machine
          </span>
          <Clock />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={screenIndex}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full"
          >
            <Screen data={data} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 pb-5">
        <div className="mb-4 flex justify-center gap-2">
          {SCREENS.map((s, i) => (
            <span
              key={s.name}
              title={s.name}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === screenIndex ? "w-8 bg-gold-400" : "w-2 bg-chalk/20"
              }`}
            />
          ))}
        </div>
        {data.recentResults.length > 0 && (
          <div className="overflow-hidden border-t border-chalk/10 pt-3">
            {/* Two full-width groups: the -50% scroll moves exactly one group,
                so results traverse the whole screen and loop seamlessly even
                when only a single match has finished. */}
            <div className="ticker-scroll flex w-max">
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  aria-hidden={copy === 1}
                  className="flex min-w-full shrink-0 justify-around gap-12 px-6"
                >
                  {data.recentResults.map((r, i) => (
                    <span
                      key={i}
                      className="font-mono text-xl whitespace-nowrap text-chalk-dim"
                    >
                      <span className="text-gold-400">FT</span> {r.homeTeam}{" "}
                      <span className="font-bold text-chalk">
                        {r.homeScore90}–{r.awayScore90}
                      </span>{" "}
                      {r.awayTeam}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
