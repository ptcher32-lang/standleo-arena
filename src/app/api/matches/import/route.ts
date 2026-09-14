import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { updateStore } from "@/lib/db";
import { error, handleError, json, parseBody } from "@/lib/http";
import { matchImportSchema } from "@/lib/validation";
import { applyMatchToUser, calcMmrDelta } from "@/lib/mmr";
import { getRankByMmr } from "@/lib/ranks";

function hasValidToken(request: NextRequest) {
  const expected = process.env.MATCH_IMPORT_TOKEN;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidToken(request)) return error("Invalid import token", 401);
    const body = parseBody(matchImportSchema, await request.json());
    const match = await updateStore((store) => {
      const match = store.matches.find((item) => item.id === body.matchId);
      if (!match) return null;
      if (match.status === "completed") return match;

      match.scoreA = body.scoreA;
      match.scoreB = body.scoreB;
      match.winner = body.winner;
      match.status = "completed";
      const now = new Date().toISOString();
      match.endedAt = now;
      match.proofAttached = body.proofAttached === true;
      const allSlots = [...match.teamA, ...match.teamB];
      const avgA = match.teamA.reduce((sum, slot) => sum + (store.users.find((user) => user.id === slot.userId)?.mmr ?? 0), 0) / Math.max(1, match.teamA.length);
      const avgB = match.teamB.reduce((sum, slot) => sum + (store.users.find((user) => user.id === slot.userId)?.mmr ?? 0), 0) / Math.max(1, match.teamB.length);
      for (const imported of body.players) {
        const slot = allSlots.find((item) => item.userId === imported.userId);
        if (!slot) continue;
        const user = store.users.find((item) => item.id === imported.userId);
        if (!user) continue;
        slot.kills = imported.kills;
        slot.deaths = imported.deaths;
        slot.assists = imported.assists;
        if (imported.ping !== undefined) slot.ping = imported.ping;
        if (imported.money !== undefined) slot.money = imported.money;
        const inA = match.teamA.some((item) => item.userId === imported.userId);
        const won = inA ? body.winner === "A" : body.winner === "B";
        const opponentAvg = inA ? avgB : avgA;
        const delta = calcMmrDelta(user.mmr, opponentAvg, won);
        slot.mmrBefore = user.mmr;
        slot.mmrDelta = delta;
        slot.mmrAfter = Math.max(0, user.mmr + delta);
        slot.rankBefore = getRankByMmr(slot.mmrBefore).name;
        slot.rankAfter = getRankByMmr(slot.mmrAfter).name;
        Object.assign(user, applyMatchToUser(user, slot, won, now));
      }
      match.mvpId = allSlots.reduce((best, slot) => (slot.kills - slot.deaths > best.kills - best.deaths ? slot : best)).userId;
      return match;
    });
    if (!match) return error("Match not found", 404);
    return json({ ok: true, match });
  } catch (err) {
    return handleError(err);
  }
}
