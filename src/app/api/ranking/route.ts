import { NextRequest } from "next/server";
import { readStore } from "@/lib/db";
import { json } from "@/lib/http";
import { toPublicUser } from "@/lib/serialize";
import { getRankName } from "@/lib/ranks";

export async function GET(request: NextRequest) {
  const board = request.nextUrl.searchParams.get("board") ?? "global";
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const rank = request.nextUrl.searchParams.get("rank") ?? "";
  const sort = request.nextUrl.searchParams.get("sort") ?? "mmr";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  const pageSize = 12;

  const store = await readStore();
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  let rows = store.users.filter((u) => !u.banned).map((u) => {
    const completed = store.matches.filter(
      (m) => m.status === "completed" && [...m.teamA, ...m.teamB].some((p) => p.userId === u.id),
    );
    const recent =
      board === "weekly"
        ? completed.filter((m) => new Date(m.endedAt ?? m.createdAt).getTime() >= weekAgo)
        : board === "monthly"
          ? completed.filter((m) => {
              const d = new Date(m.endedAt ?? m.createdAt);
              const n = new Date();
              return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
            })
          : completed;
    const wins = recent.filter((m) => {
      const inA = m.teamA.some((p) => p.userId === u.id);
      return (inA && m.winner === "A") || (!inA && m.winner === "B");
    }).length;
    const pub = toPublicUser(u);
    return {
      ...pub,
      boardMatches: recent.length,
      boardWins: board === "global" ? pub.wins : wins,
      boardWinRate:
        recent.length === 0 ? 0 : Math.round(((board === "global" ? pub.wins : wins) / (board === "global" ? pub.matchesPlayed || 1 : recent.length)) * 1000) / 10,
    };
  });

  if (q) rows = rows.filter((r) => r.nick.toLowerCase().includes(q) || r.publicId.toLowerCase().includes(q));
  if (rank) rows = rows.filter((r) => getRankName(r.mmr) === rank);

  rows.sort((a, b) => {
    if (sort === "wins") return b.boardWins - a.boardWins;
    if (sort === "winrate") return b.boardWinRate - a.boardWinRate;
    if (sort === "matches") return b.boardMatches - a.boardMatches;
    return b.mmr - a.mmr;
  });

  const total = rows.length;
  const slice = rows.slice((page - 1) * pageSize, page * pageSize).map((row, i) => ({
    ...row,
    place: (page - 1) * pageSize + i + 1,
  }));

  return json({ rows: slice, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) });
}
