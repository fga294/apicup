"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const RULES = [
  {
    emoji: "🔒",
    text: (
      <>
        Once a prediction is submitted, <b>it cannot be changed</b>.
      </>
    ),
  },
  {
    emoji: "⏰",
    text: (
      <>
        Predictions must be in at least <b>1 hour before kick-off</b>.
      </>
    ),
  },
  {
    emoji: "⚽",
    text: <>Earn points for accuracy:</>,
  },
] as const;

const POINTS = [
  { chip: "+10", chipCls: "bg-gold-400/20 text-gold-300", text: "Correct winner/draw and exact score" },
  { chip: "+5", chipCls: "bg-limey-400/20 text-limey-300", text: "Correct winner/draw, wrong score" },
  { chip: "0", chipCls: "bg-chalk/10 text-chalk-dim", text: "Incorrect outcome — or no pick before cutoff" },
] as const;

/** One-time post-registration welcome; dismissing strips ?welcome from the URL. */
export function WelcomeModal() {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const dismiss = () => router.replace("/");

  useEffect(() => {
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-950/80 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-gold-400/40 bg-pitch-900 p-7 shadow-[0_0_60px_rgba(255,197,61,0.15)]"
      >
        <p className="text-center text-5xl">🎯</p>
        <h2
          id="welcome-title"
          className="mt-3 text-center font-display text-3xl uppercase tracking-wide"
        >
          Welcome to <span className="text-gold-400">The API Cup</span> ⚽!
        </h2>
        <p className="mt-1 text-center text-sm italic text-chalk-dim">
          The Artificial Prediction Intelligence challenge
        </p>

        <p className="mt-5 text-sm font-semibold text-chalk">
          Before you get started, here are the key rules:
        </p>
        <ul className="mt-3 space-y-2.5 text-sm text-chalk-dim">
          {RULES.map((rule, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden>{rule.emoji}</span>
              <span>{rule.text}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-2.5 ml-7 space-y-2 text-sm text-chalk-dim">
          {POINTS.map((p) => (
            <li key={p.chip} className="flex items-center gap-2.5">
              <span
                className={`w-11 rounded-full px-2 py-0.5 text-center font-mono text-xs font-black ${p.chipCls}`}
              >
                {p.chip}
              </span>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>

        <button
          ref={buttonRef}
          onClick={dismiss}
          className="mt-6 w-full rounded-xl bg-gold-400 py-2.5 font-bold text-pitch-950 transition hover:bg-gold-300"
        >
          Got it — let&apos;s play! 🏆
        </button>
        <p className="mt-3 text-center text-xs text-chalk-dim/70">
          Good luck — the machine is watching. 🤖
        </p>
      </motion.div>
    </div>
  );
}
