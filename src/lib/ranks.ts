export type RankName =
  | "Bronze 1"
  | "Bronze 2"
  | "Bronze 3"
  | "Bronze 4"
  | "Silver 1"
  | "Silver 2"
  | "Silver 3"
  | "Silver 4"
  | "Gold 1"
  | "Gold 2"
  | "Gold 3"
  | "Gold 4"
  | "Phoenix"
  | "Ranger"
  | "Champion"
  | "Master"
  | "Elite"
  | "The Legend";

export type RankDefinition = {
  name: RankName;
  min: number;
  max: number;
  tier: "bronze" | "silver" | "gold" | "phoenix" | "ranger" | "champion" | "master" | "elite" | "legend";
  color: string;
  glow: string;
};

/** Canonical STANDLEO LITE rank table. Do not rename or change ranges. */
export const RANKS: readonly RankDefinition[] = [
  { name: "Bronze 1", min: 0, max: 285, tier: "bronze", color: "#b87333", glow: "rgba(184,115,51,0.35)" },
  { name: "Bronze 2", min: 286, max: 395, tier: "bronze", color: "#c17f3e", glow: "rgba(193,127,62,0.35)" },
  { name: "Bronze 3", min: 396, max: 495, tier: "bronze", color: "#cd8c48", glow: "rgba(205,140,72,0.35)" },
  { name: "Bronze 4", min: 496, max: 590, tier: "bronze", color: "#d9a066", glow: "rgba(217,160,102,0.4)" },
  { name: "Silver 1", min: 591, max: 710, tier: "silver", color: "#9aa4b2", glow: "rgba(154,164,178,0.35)" },
  { name: "Silver 2", min: 711, max: 825, tier: "silver", color: "#b3bcc8", glow: "rgba(179,188,200,0.35)" },
  { name: "Silver 3", min: 826, max: 940, tier: "silver", color: "#cfd6de", glow: "rgba(207,214,222,0.4)" },
  { name: "Silver 4", min: 941, max: 1050, tier: "silver", color: "#e8eef4", glow: "rgba(232,238,244,0.4)" },
  { name: "Gold 1", min: 1051, max: 1155, tier: "gold", color: "#d4a017", glow: "rgba(212,160,23,0.4)" },
  { name: "Gold 2", min: 1156, max: 1250, tier: "gold", color: "#e6b422", glow: "rgba(230,180,34,0.4)" },
  { name: "Gold 3", min: 1251, max: 1350, tier: "gold", color: "#f0c14a", glow: "rgba(240,193,74,0.45)" },
  { name: "Gold 4", min: 1351, max: 1440, tier: "gold", color: "#ffe27a", glow: "rgba(255,226,122,0.5)" },
  { name: "Phoenix", min: 1441, max: 1525, tier: "phoenix", color: "#ff6b35", glow: "rgba(255,107,53,0.45)" },
  { name: "Ranger", min: 1526, max: 1600, tier: "ranger", color: "#3dcf7a", glow: "rgba(61,207,122,0.45)" },
  { name: "Champion", min: 1601, max: 1675, tier: "champion", color: "#4da3ff", glow: "rgba(77,163,255,0.45)" },
  { name: "Master", min: 1676, max: 1795, tier: "master", color: "#a855f7", glow: "rgba(168,85,247,0.45)" },
  { name: "Elite", min: 1796, max: 2120, tier: "elite", color: "#f43f8c", glow: "rgba(244,63,140,0.5)" },
  { name: "The Legend", min: 2121, max: Number.POSITIVE_INFINITY, tier: "legend", color: "#d4ff3f", glow: "rgba(212,255,63,0.55)" },
] as const;

export type RankProgress = {
  rank: RankDefinition;
  next: RankDefinition | null;
  previous: RankDefinition | null;
  mmr: number;
  mmrToNext: number | null;
  progress: number;
};

function clampMmr(mmr: number): number {
  if (!Number.isFinite(mmr)) return 0;
  return Math.max(0, Math.floor(mmr));
}

/** Single source of truth: resolve rank from current MMR. */
export function getRankByMmr(mmr: number): RankDefinition {
  const value = clampMmr(mmr);
  const found = RANKS.find((rank) => value >= rank.min && value <= rank.max);
  return found ?? RANKS[RANKS.length - 1];
}

export function getRankProgress(mmr: number): RankProgress {
  const value = clampMmr(mmr);
  const index = RANKS.findIndex((rank) => value >= rank.min && value <= rank.max);
  const safeIndex = index === -1 ? RANKS.length - 1 : index;
  const rank = RANKS[safeIndex];
  const next = RANKS[safeIndex + 1] ?? null;
  const previous = RANKS[safeIndex - 1] ?? null;

  if (!next) {
    return { rank, next: null, previous, mmr: value, mmrToNext: null, progress: 100 };
  }

  const span = next.min - rank.min;
  const gained = value - rank.min;
  const progress = span <= 0 ? 100 : Math.min(100, Math.max(0, (gained / span) * 100));
  const mmrToNext = Math.max(0, next.min - value);

  return { rank, next, previous, mmr: value, mmrToNext, progress };
}

export function getRankName(mmr: number): RankName {
  return getRankByMmr(mmr).name;
}
