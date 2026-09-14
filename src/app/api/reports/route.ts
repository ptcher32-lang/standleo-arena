import { NextRequest } from "next/server";
import { randomToken } from "@/lib/crypto";
import { updateStore } from "@/lib/db";
import { error, handleError, json, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { reportSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!rateLimit(`reports:${user.id}`, 10, 60_000)) return error("Too many reports", 429);
    const body = parseBody(reportSchema, await request.json());
    const report = await updateStore((store) => {
      const target = body.targetId ? store.users.find((item) => item.id === body.targetId) : undefined;
      const targetKd = target ? target.kills / Math.max(1, target.deaths) : 0;
      const targetWinRate = target ? target.wins / Math.max(1, target.wins + target.losses) : 0;
      const riskScore = target
        ? Math.min(100, Math.round(
            (targetKd >= 3 ? 45 : targetKd >= 2 ? 25 : 0) +
            (target.wins + target.losses >= 10 && targetWinRate >= 0.85 ? 35 : target.wins + target.losses >= 10 && targetWinRate >= 0.7 ? 15 : 0) +
            (target.currentStreak >= 8 ? 20 : target.currentStreak >= 5 ? 10 : 0),
          ))
        : undefined;
      const item = {
        id: `r_${randomToken(4)}`,
        reporterId: user.id,
        targetId: body.targetId,
        matchId: body.matchId,
        reason: body.reason,
        evidenceUrl: body.evidenceUrl,
        riskScore,
        status: "open" as const,
        createdAt: new Date().toISOString(),
      };
      store.reports.unshift(item);
      return item;
    });
    return json({ report }, 201);
  } catch (err) {
    return handleError(err);
  }
}
