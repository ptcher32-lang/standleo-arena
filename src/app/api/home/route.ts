import { NextRequest } from "next/server";
import { json } from "@/lib/http";
import { readStore } from "@/lib/db";
import { isOnline, toPublicUser } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const store = await readStore();
  const online = store.users.filter(isOnline).length;
  const live = store.matches.filter((m) => m.status === "live").length;
  const recent = store.matches.filter((m) => m.status === "completed").slice(0, 6);
  const top = [...store.users]
    .filter((u) => !u.banned)
    .sort((a, b) => b.mmr - a.mmr)
    .slice(0, 6)
    .map(toPublicUser);
  return json({
    online,
    registered: store.users.length,
    live,
    recent,
    top,
    usersById: Object.fromEntries(store.users.map((u) => [u.id, toPublicUser(u)])),
  });
}
