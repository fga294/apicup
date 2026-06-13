"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * Compact "scan to join" QR for Office TV mode, tucked discreetly into the
 * corner. Dark-on-cream modules stay scannable up close; the translucent card
 * keeps it from blocking the rotating content behind it.
 */
export function JoinQr({ url }: { url: string }) {
  return (
    <div className="absolute bottom-20 right-5 z-30 flex flex-col items-center gap-1 rounded-lg border border-gold-400/25 bg-pitch-900/65 p-1.5 shadow-md backdrop-blur-sm">
      <div className="rounded bg-[#fff7e6] p-1">
        <QRCodeSVG
          value={url}
          size={72}
          bgColor="#fff7e6"
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
