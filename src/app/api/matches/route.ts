import { readStore } from "@/lib/db";
import { error, json } from "@/lib/http";
import { maybeAutoFinish } from "@/lib/matchmaking";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return error("Unauthorized", 401);
  const store = await readStore();
  let matches = store.matches;
  for (const match of matches.filter((m) => m.status === "live")) {
    await maybeAutoFinish(match);
  }
  const fresh = await readStore();
  matches = fresh.matches;
  matches = matches.filter((m) => [...m.teamA, ...m.teamB].some((p) => p.userId === user.id));
  return json({
    matches: matches.slice(0, 80),
    users: Object.fromEntries(fresh.users.map((u) => [u.id, {
      nick: u.nick,
      avatarHue: u.avatarHue,
      avatarUrl: u.avatarUrl,
      mmr: u.mmr,
    }])),
  });
}
