"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * World-Cup-themed "scan to join" QR for Office TV mode. Dark modules on a
 * warm cream field keep contrast high (reliable scanning) while the gold
 * frame, trophy, and pennant trim carry the tournament look.
 */
export function JoinQr({ url }: { url: string }) {
  return (
    <div className="absolute bottom-24 right-8 z-30 overflow-hidden rounded-2xl border border-gold-400/60 bg-pitch-900/90 shadow-[0_0_45px_rgba(255,197,61,0.25)] backdrop-blur">
      {/* Pennant bunting strip */}
      <div className="flex h-2 w-full">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className={
              ["bg-gold-400", "bg-coral-400", "bg-limey-400", "bg-skyx-400"][i % 4]
            }
            style={{ width: `${100 / 12}%` }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 px-4 pb-3 pt-2.5">
        <p className="flex items-center gap-1.5 font-display text-xl uppercase tracking-wide text-gold-300">
          🏆 Scan to join
        </p>
        <div className="rounded-lg bg-[#fff7e6] p-2.5 shadow-inner">
          <QRCodeSVG
            value={url}
            size={132}
            bgColor="#fff7e6"
            fgColor="#0e0c09"
            level="M"
            marginSize={0}
          />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-chalk-dim">
          Predict · Compete · Beat the AI 🤖
        </p>
      </div>
    </div>
  );
}
