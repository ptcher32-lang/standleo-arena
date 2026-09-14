"use client";

export function MmrChart({ history }: { history: { at: string; mmr: number }[] }) {
  const safeHistory = history ?? [];
  if (!safeHistory.length) return <p className="text-sm text-white/40">Нет истории MMR</p>;
  const values = safeHistory.map((h) => h.mmr);
  const min = Math.min(...values) - 20;
  const max = Math.max(...values) + 20;
  const w = 640;
  const h = 180;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * w;
    const y = h - ((v - min) / Math.max(1, max - min)) * h;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full overflow-visible">
      <defs>
        <linearGradient id="mmrFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7dffb3" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7dffb3" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill="url(#mmrFill)" stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke="#7dffb3" strokeWidth="3" />
    </svg>
  );
}
