import { NextRequest } from "next/server";
import { readStore, updateStore } from "@/lib/db";
import { error, handleError, json } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { isOnline, toPublicUser } from "@/lib/serialize";
import { standleoLite } from "@/lib/standleo";
import { finishMatch } from "@/lib/matchmaking";
import { adminActionSchema } from "@/lib/validation";
import { readFile } from "fs/promises";
import path from "path";
import { recognizeMatchScore } from "@/lib/proof-ocr";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const section = request.nextUrl.searchParams.get("section") ?? "dashboard";
    const q = request.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";
    const store = await readStore();
    const server = await standleoLite.getServerStatus();

    if (section === "dashboard") {
      return json({
        users: store.users.length,
        online: store.users.filter(isOnline).length,
        matches: store.matches.length,
        live: store.matches.filter((m) => m.status === "live").length,
        searching: store.queues.filter((q) => !q.cancelled && !q.matchId).length,
        reportsOpen: store.reports.filter((r) => r.status === "open").length,
        server,
      });
    }

    if (section === "users" || section === "players") {
      const users = store.users
        .filter((u) => !q || u.nick.toLowerCase().includes(q) || u.email.includes(q) || u.publicId.toLowerCase().includes(q))
        .map((u) => ({
          ...toPublicUser(u),
          email: u.email,
          antiCheatRisk: Math.min(100, Math.round(
            (u.kills / Math.max(1, u.deaths) >= 3 ? 45 : u.kills / Math.max(1, u.deaths) >= 2 ? 25 : 0) +
            (u.wins + u.losses >= 10 && u.wins / Math.max(1, u.wins + u.losses) >= 0.85 ? 35 : 0) +
            (u.currentStreak >= 8 ? 20 : u.currentStreak >= 5 ? 10 : 0),
          )),
        }));
      return json({ users });
    }

    if (section === "matches") {
      return json({ matches: store.matches });
    }

    if (section === "reports") {
      return json({ reports: store.reports });
    }

    if (section === "news") {
      return json({ news: store.news });
    }

    return error("Unknown section", 400);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = adminActionSchema.parse(await request.json());
    if (body.action === "analyze_match" && body.matchId) {
      const store = await readStore();
      const match = store.matches.find((item) => item.id === body.matchId);
      if (!match) return error("Match not found", 404);
      if (!match.proofUrl) return error("Сначала нужен скрин результата", 400);
      const image = await readFile(path.join(process.cwd(), "public", match.proofUrl.replace(/^\/+/, "")));
      const detected = await recognizeMatchScore(image, {
      A: match.teamA.map((slot) => store.users.find((user) => user.id === slot.userId)?.nick ?? ""),
      B: match.teamB.map((slot) => store.users.find((user) => user.id === slot.userId)?.nick ?? ""),
      });
      if (!detected) return error("Не удалось уверенно распознать разный счёт", 422);
      return json(detected);
    }
    if (body.action === "ban" && body.userId) {
      await updateStore((s) => {
        const u = s.users.find((x) => x.id === body.userId);
        if (u && u.role !== "admin") {
          u.banned = true;
          s.sessions = s.sessions.filter((session) => session.userId !== u.id);
          s.queues.forEach((queue) => {
            if (queue.userId === u.id) queue.cancelled = true;
          });
        }
      });
    }
    if (body.action === "unban" && body.userId) {
      await updateStore((s) => {
        const u = s.users.find((x) => x.id === body.userId);
        if (u) u.banned = false;
      });
    }
    if ((body.action === "kick" || body.action === "ban_device") && body.userId) {
      await updateStore((s) => {
        const u = s.users.find((x) => x.id === body.userId);
        if (!u || u.role === "admin") return;
        const deviceIds = s.sessions
          .filter((session) => session.userId === u.id && session.deviceId)
          .map((session) => session.deviceId as string);
        s.sessions = s.sessions.filter((session) => session.userId !== u.id);
        s.queues.forEach((queue) => {
          if (queue.userId === u.id) queue.cancelled = true;
        });
        if (body.action === "ban_device") {
          const existing = new Set(s.deviceBans.map((ban) => ban.deviceId));
          deviceIds.forEach((deviceId) => {
            if (!existing.has(deviceId)) {
              s.deviceBans.push({ deviceId, userId: u.id, createdAt: new Date().toISOString() });
            }
          });
          u.banned = true;
        }
      });
    }
    if (body.action === "report" && body.reportId && body.status) {
      await updateStore((s) => {
        const r = s.reports.find((x) => x.id === body.reportId);
        if (r) r.status = body.status!;
      });
    }
    if (
      body.action === "complete_match" &&
      body.matchId &&
      (body.winner === "A" || body.winner === "B") &&
      typeof body.scoreA === "number" &&
      typeof body.scoreB === "number" &&
      Number.isInteger(body.scoreA) &&
      Number.isInteger(body.scoreB) &&
      body.scoreA >= 0 &&
      body.scoreB >= 0 &&
      body.scoreA !== body.scoreB
    ) {
      const match = await finishMatch(body.matchId, body.winner, body.scoreA, body.scoreB, body.proofAttached === true);
      if (!match) return error("Match not found", 404);
    } else if (body.action === "complete_match") {
      return error("A valid winner and different non-negative scores are required", 400);
    }
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
