export function MovementChip({ movement }: { movement: number | null }) {
  if (movement === null) {
    return (
      <span className="rounded-full bg-skyx-400/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-skyx-300">
        NEW
      </span>
    );
  }
  if (movement > 0) {
    return (
      <span
        className="rounded-full bg-limey-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-limey-300"
        title={`Up ${movement} position${movement === 1 ? "" : "s"}`}
      >
        ▲ +{movement}
      </span>
    );
  }
  if (movement < 0) {
    return (
      <span
        className="rounded-full bg-coral-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-coral-300"
        title={`Down ${-movement} position${movement === -1 ? "" : "s"}`}
      >
        ▼ {movement}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-chalk/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-chalk-dim">
      ▬
    </span>
  );
}
