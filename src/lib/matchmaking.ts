import { getRankByMmr } from "./ranks";
import { readStore, updateStore } from "./db";
import { applyMatchToUser, calcMmrDelta } from "./mmr";
import { isOnline, teamSize } from "./serialize";
import type { Match, MatchMap, MatchMode, MatchPlatform, MatchPlayer, SearchQueue, User } from "./types";
import { randomToken } from "./crypto";

function randomStats(seed: number) {
  return {
    kills: 8 + (seed % 14),
    deaths: 6 + (seed % 10),
    assists: 2 + (seed % 7),
  };
}

export function searchRange(mmr: number): { min: number; max: number } {
  const spread = 80;
  return { min: Math.max(0, mmr - spread), max: mmr + spread };
}

export async function startSearch(userId: string, mode: MatchMode, platform: MatchPlatform, map: MatchMap): Promise<SearchQueue> {
  return updateStore((store) => {
    store.queues = store.queues.filter((q) => !(q.userId === userId && !q.cancelled && !q.matchId));
    const needed = teamSize(mode) * 2;
    const queue: SearchQueue = {
      id: `q_${randomToken(6)}`,
      userId,
      mode,
      platform,
      map,
      startedAt: new Date().toISOString(),
      found: 1,
      needed,
      cancelled: false,
    };
    store.queues.push(queue);
    return queue;
  });
}

export async function tickSearch(queueId: string): Promise<SearchQueue | null> {
  const store = await readStore();
  const queue = store.queues.find((q) => q.id === queueId);
  if (!queue || queue.cancelled) return queue ?? null;
  if (queue.matchId) return queue;

  return completeSearch(queueId);
}

async function completeSearch(queueId: string): Promise<SearchQueue | null> {
  return updateStore((store) => {
    const queue = store.queues.find((q) => q.id === queueId);
    if (!queue || queue.matchId || queue.cancelled) return queue ?? null;
    const size = teamSize(queue.mode);
    const searchingUser = store.users.find((user) => user.id === queue.userId);
    if (!searchingUser || searchingUser.banned || !isOnline(searchingUser)) return queue;
    const searchingTier = getRankByMmr(searchingUser.mmr).tier;
    const candidates = store.queues
      .filter((item) => {
        if (item.cancelled || item.matchId || item.mode !== queue.mode || item.platform !== queue.platform || item.map !== queue.map) return false;
        const user = store.users.find((candidate) => candidate.id === item.userId);
        return Boolean(user && !user.banned && isOnline(user) && getRankByMmr(user.mmr).tier === searchingTier);
      })
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    if (candidates.length < queue.needed) {
      queue.found = candidates.length;
      return queue;
    }

    const matchedQueues = candidates.slice(0, queue.needed);
    const matchedUsers = matchedQueues
      .map((item) => store.users.find((user) => user.id === item.userId))
      .filter((user): user is User => Boolean(user && !user.banned && isOnline(user)));
    if (matchedUsers.length < queue.needed) return queue;

    const teamAUsers = matchedUsers.slice(0, size);
    const teamBUsers = matchedUsers.slice(size, size * 2);

    const placeholder = (user: User): MatchPlayer => ({
      userId: user.id,
      kills: 0,
      deaths: 0,
      assists: 0,
      mmrBefore: user.mmr,
      mmrDelta: 0,
      mmrAfter: user.mmr,
      rankBefore: getRankByMmr(user.mmr).name,
      rankAfter: getRankByMmr(user.mmr).name,
    });

    const match: Match = {
      id: `m_${randomToken(5)}`,
      mode: queue.mode,
      platform: queue.platform,
      map: queue.map,
      status: "live",
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      teamA: teamAUsers.map(placeholder),
      teamB: teamBUsers.map(placeholder),
      scoreA: 0,
      scoreB: 0,
      winner: null,
    };

    store.matches.unshift(match);
    matchedQueues.forEach((matchedQueue) => {
      matchedQueue.found = matchedQueue.needed;
      matchedQueue.matchId = match.id;
    });

    const ids = [...teamAUsers, ...teamBUsers].map((u) => u.id);
    ids.forEach((id) => {
      if (id === queue.userId) return;
      store.notifications.unshift({
        id: `nt_${randomToken(5)}`,
        userId: id,
        type: "match_invite",
        title: "Match found",
        body: `You were matched into a ${queue.mode} lobby on ${queue.map}`,
        read: false,
        createdAt: new Date().toISOString(),
        href: `/matches/${match.id}`,
      });
    });

    return queue;
  });
}

export async function cancelSearch(userId: string): Promise<void> {
  await updateStore((store) => {
    store.queues.forEach((q) => {
      if (q.userId === userId && !q.matchId) q.cancelled = true;
    });
  });
}

export async function updatePlayerStats(
  matchId: string,
  winnerId: string,
  scoreA: number,
  scoreB: number,
  proofAttached = false,
): Promise<Match | null> {
  return updateStore((store) => {
    const match = store.matches.find((m) => m.id === matchId);
    if (!match || match.status === "completed") return match ?? null;
    const winner =
      winnerId === "A" || winnerId === "B"
        ? winnerId
        : match.teamA.some((slot) => slot.userId === winnerId)
          ? "A"
          : match.teamB.some((slot) => slot.userId === winnerId)
            ? "B"
            : null;
    if (!winner) throw new Error("WINNER_NOT_IN_MATCH");

    const now = new Date().toISOString();
    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.winner = winner;
    match.status = "completed";
    match.endedAt = now;
    match.proofAttached = proofAttached;

    const usersOf = (slots: MatchPlayer[]) =>
      slots.map((p) => store.users.find((u) => u.id === p.userId)).filter((u): u is User => Boolean(u));

    const teamAUsers = usersOf(match.teamA);
    const teamBUsers = usersOf(match.teamB);
    const avgA = teamAUsers.reduce((s, u) => s + u.mmr, 0) / Math.max(1, teamAUsers.length);
    const avgB = teamBUsers.reduce((s, u) => s + u.mmr, 0) / Math.max(1, teamBUsers.length);

    const decorate = (slots: MatchPlayer[], opponentsAvg: number, won: boolean) => {
      slots.forEach((slot, i) => {
        const user = store.users.find((u) => u.id === slot.userId);
        if (!user) return;
        const stats = randomStats(user.mmr + i + matchId.length);
        const delta = calcMmrDelta(user.mmr, opponentsAvg, won);
        const mmrAfter = Math.max(0, user.mmr + delta);
        slot.kills = stats.kills;
        slot.deaths = stats.deaths;
        slot.assists = stats.assists;
        slot.mmrBefore = user.mmr;
        slot.mmrDelta = delta;
        slot.mmrAfter = mmrAfter;
        slot.rankBefore = getRankByMmr(user.mmr).name;
        slot.rankAfter = getRankByMmr(mmrAfter).name;
        const updated = applyMatchToUser(user, slot, won, now);
        Object.assign(user, updated);

        store.notifications.unshift({
          id: `nt_${randomToken(5)}`,
          userId: user.id,
          type: "match_result",
          title: won ? "Victory" : "Defeat",
          body: `${won ? "+" : ""}${delta} MMR · ${slot.rankAfter}`,
          read: false,
          createdAt: now,
          href: `/matches/${match.id}`,
        });
        if (slot.rankAfter !== slot.rankBefore && mmrAfter > slot.mmrBefore) {
          store.notifications.unshift({
            id: `nt_${randomToken(5)}`,
            userId: user.id,
            type: "rank_up",
            title: "New rank",
            body: `Promoted to ${slot.rankAfter}`,
            read: false,
            createdAt: now,
            href: `/players/${user.id}`,
          });
        }
        store.notifications.unshift({
          id: `nt_${randomToken(5)}`,
          userId: user.id,
          type: "mmr_change",
          title: "MMR updated",
          body: `${slot.mmrBefore} → ${slot.mmrAfter}`,
          read: false,
          createdAt: now,
          href: `/players/${user.id}`,
        });
      });
    };

    decorate(match.teamA, avgB, winner === "A");
    decorate(match.teamB, avgA, winner === "B");

    const all = [...match.teamA, ...match.teamB];
    match.mvpId = all.reduce((best, p) => (p.kills - p.deaths > best.kills - best.deaths ? p : best)).userId;
    store.queues.forEach((queue) => {
      if (queue.matchId === match.id) queue.cancelled = true;
    });
    return match;
  });
}

export async function finishMatch(
  matchId: string,
  winner: "A" | "B",
  scoreA: number,
  scoreB: number,
  proofAttached = false,
): Promise<Match | null> {
  return updatePlayerStats(matchId, winner, scoreA, scoreB, proofAttached);
}

export async function maybeAutoFinish(match: Match): Promise<Match> {
  return match;
}
