const COLORS = ["#ffc53d", "#ef4937", "#aee23e", "#58c7f3", "#e8e8ee", "#ff8d80"];

// Deterministic pieces: SSR and client must render identical markup.
const PIECES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53.7) % 100,
  delay: (i * 0.93) % 6,
  duration: 7 + ((i * 1.37) % 5),
  color: COLORS[i % COLORS.length],
  skew: (i % 5) * 8 - 16,
}));

/** Slow ticker-tape confetti drifting down the page. Pure CSS, GPU-cheap. */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: p.color,
            transform: `skewX(${p.skew}deg)`,
          }}
        />
      ))}
    </div>
  );
}
