import { getRankByMmr } from "./ranks";
import type { MatchPlayer, User } from "./types";

const BASE = 24;
const MIN_DELTA = 8;
const MAX_DELTA = 38;

export function calcMmrDelta(playerMmr: number, opponentAvg: number, won: boolean): number {
  const diff = (opponentAvg - playerMmr) / 400;
  const raw = won ? BASE * (1 + diff) : -BASE * (1 - diff);
  const clamped = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, Math.round(raw)));
  if (won) return Math.max(MIN_DELTA, clamped);
  return Math.min(-MIN_DELTA, clamped);
}

export function applyMatchToUser(user: User, slot: MatchPlayer, won: boolean, now: string): User {
  const mmr = Math.max(0, slot.mmrAfter);
  const peakMmr = Math.max(user.peakMmr, mmr);
  const wins = user.wins + (won ? 1 : 0);
  const losses = user.losses + (won ? 0 : 1);
  const currentStreak = won ? (user.currentStreak > 0 ? user.currentStreak + 1 : 1) : user.currentStreak < 0 ? user.currentStreak - 1 : -1;
  const winStreak = Math.max(user.winStreak, currentStreak > 0 ? currentStreak : 0);
  const achievements = [...user.achievements];
  const rankBefore = getRankByMmr(slot.mmrBefore).name;
  const rankAfter = getRankByMmr(mmr).name;

  if (wins === 1 && !achievements.includes("first_blood")) achievements.push("first_blood");
  if (wins === 10 && !achievements.includes("ten_wins")) achievements.push("ten_wins");
  if (winStreak >= 5 && !achievements.includes("hot_streak")) achievements.push("hot_streak");
  if (rankAfter !== rankBefore && mmr > slot.mmrBefore && !achievements.includes("rank_climber")) {
    achievements.push("rank_climber");
  }
  if (mmr >= 2121 && !achievements.includes("legend")) achievements.push("legend");

  return {
    ...user,
    mmr,
    peakMmr,
    wins,
    losses,
    kills: user.kills + slot.kills,
    deaths: user.deaths + slot.deaths,
    currentStreak,
    winStreak,
    mmrHistory: [...user.mmrHistory, { at: now, mmr }].slice(-40),
    achievements,
  };
}

export const ACHIEVEMENT_LABELS: Record<string, { title: string; hint: string }> = {
  first_blood: { title: "First Blood", hint: "Win your first ranked match" },
  ten_wins: { title: "Ten Wins", hint: "Reach 10 victories" },
  hot_streak: { title: "Hot Streak", hint: "Win 5 matches in a row" },
  rank_climber: { title: "Rank Climber", hint: "Promote to a new rank" },
  legend: { title: "Living Legend", hint: "Reach The Legend" },
  founder: { title: "Founder", hint: "Early STANDLEO LITE member" },
};
