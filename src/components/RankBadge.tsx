"use client";

import { getRankByMmr, getRankProgress } from "@/lib/ranks";

export function RankBadge({ mmr, size = "md" }: { mmr: number; size?: "sm" | "md" | "lg" }) {
  const rank = getRankByMmr(mmr);
  const dim = size === "lg" ? 42 : size === "sm" ? 22 : 30;
  return (
    <span className="inline-flex items-center gap-2">
      <RankMark tier={rank.tier} color={rank.color} glow={rank.glow} size={dim} />
      <span className="font-semibold tracking-wide" style={{ color: rank.color }}>
        {rank.name}
      </span>
    </span>
  );
}

export function RankMark({
  tier,
  color,
  glow,
  size,
}: {
  tier: string;
  color: string;
  glow: string;
  size: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <filter id={`g-${tier}-${size}`}>
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={color} floodOpacity="0.7" />
        </filter>
      </defs>
      {tier.startsWith("bronze") || tier === "bronze" ? (
        <polygon points="24,4 44,16 44,32 24,44 4,32 4,16" fill="none" stroke={color} strokeWidth="3" filter={`url(#g-${tier}-${size})`} />
      ) : null}
      {tier === "silver" ? (
        <polygon points="24,5 40,24 24,43 8,24" fill="none" stroke={color} strokeWidth="3" />
      ) : null}
      {tier === "gold" ? (
        <>
          <polygon points="24,4 44,18 36,42 12,42 4,18" fill="none" stroke={color} strokeWidth="3" />
          <circle cx="24" cy="24" r="6" fill={color} />
        </>
      ) : null}
      {tier === "phoenix" ? (
        <path d="M24 6 L30 20 L44 22 L33 32 L36 44 L24 37 L12 44 L15 32 L4 22 L18 20 Z" fill="none" stroke={color} strokeWidth="2.5" />
      ) : null}
      {tier === "ranger" ? (
        <path d="M8 34 L24 6 L40 34 Z" fill="none" stroke={color} strokeWidth="3" />
      ) : null}
      {tier === "champion" ? (
        <path d="M10 14 H38 V20 L24 42 L10 20 Z" fill="none" stroke={color} strokeWidth="3" />
      ) : null}
      {tier === "master" ? (
        <polygon points="24,6 29,18 42,18 32,26 36,40 24,32 12,40 16,26 6,18 19,18" fill="none" stroke={color} strokeWidth="2.4" />
      ) : null}
      {tier === "elite" ? (
        <circle cx="24" cy="24" r="16" fill="none" stroke={color} strokeWidth="3" />
      ) : null}
      {tier === "legend" ? (
        <>
          <circle cx="24" cy="24" r="16" fill="none" stroke={color} strokeWidth="3" />
          <polygon points="24,10 28,22 40,22 30,30 34,42 24,34 14,42 18,30 8,22 20,22" fill={color} />
        </>
      ) : null}
      <circle cx="24" cy="24" r="2.2" fill={color} style={{ filter: `drop-shadow(0 0 6px ${glow})` }} />
    </svg>
  );
}

export function RankProgressBar({ mmr }: { mmr: number }) {
  const p = getRankProgress(mmr);
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">{p.rank.name}</p>
          <p className="text-2xl font-semibold">{p.mmr} MMR</p>
        </div>
        {p.next ? (
          <p className="text-sm text-white/60">
            До {p.next.name}: <span className="text-accent">{p.mmrToNext} MMR</span>
          </p>
        ) : (
          <p className="text-sm text-volt">Максимальное звание</p>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p.progress}%`, background: p.rank.color, boxShadow: `0 0 16px ${p.rank.glow}` }}
        />
      </div>
    </div>
  );
}
