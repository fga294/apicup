"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * Compact "scan to join" QR for Office TV mode, tucked discreetly into the
 * corner. The background is the palette's muted "chalk" tone rather than bright
 * white so it blends into the dark theme; near-black modules keep contrast at
 * ~8:1 — dim but still reliably scannable up close, which is the TV use case.
 */
export function JoinQr({ url }: { url: string }) {
  return (
    <div className="absolute bottom-20 right-5 z-30 flex flex-col items-center gap-1 rounded-lg border border-gold-400/25 bg-pitch-900/65 p-1.5 shadow-md backdrop-blur-sm">
      <div className="rounded bg-[#b9ae9b] p-1.5">
        <QRCodeSVG
          value={url}
          size={72}
          bgColor="#b9ae9b"
          fgColor="#0e0c09"
          level="M"
          marginSize={0}
        />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-chalk-dim/80">
        🏆 Scan to join
      </p>
    </div>
  );
}
