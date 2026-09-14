import { getRankName } from "./ranks";
import type { PublicUser, User } from "./types";

const ONLINE_WINDOW_MS = 60_000;

export function isOnline(user: User): boolean {
  return user.online && Date.now() - new Date(user.lastSeen).getTime() <= ONLINE_WINDOW_MS;
}

export function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 1000) / 10;
}

export function kd(kills: number, deaths: number): number {
  if (deaths === 0) return kills;
  return Math.round((kills / deaths) * 100) / 100;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    publicId: user.publicId,
    nick: user.nick,
    bio: user.bio,
    playstyle: user.playstyle,
    contact: user.contact,
    avatarHue: user.avatarHue,
    avatarUrl: user.avatarUrl,
    rankFrameUrl: user.rankFrameUrl,
    avatarFrameUrl: user.avatarFrameUrl,
    stickers: user.stickers ?? [],
    profileBadges: user.profileBadges ?? [],
    verified: user.verified ?? user.role === "admin",
    createdAt: user.createdAt,
    role: user.role,
    banned: user.banned,
    mmr: user.mmr,
    peakMmr: user.peakMmr,
    wins: user.wins,
    losses: user.losses,
    kills: user.kills,
    deaths: user.deaths,
    winStreak: user.winStreak,
    currentStreak: user.currentStreak,
    mmrHistory: user.mmrHistory,
    achievements: user.achievements,
    online: isOnline(user),
    lastSeen: user.lastSeen,
    rank: getRankName(user.mmr),
    winRate: winRate(user.wins, user.losses),
    kd: kd(user.kills, user.deaths),
    matchesPlayed: user.wins + user.losses,
  };
}

export function teamSize(mode: "1v1" | "2v2" | "3v3" | "5v5"): number {
  return Number(mode[0]) as 1 | 2 | 3 | 5;
}

export function isoDaysAgo(days: number, extraHours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - extraHours);
  return d.toISOString();
}
