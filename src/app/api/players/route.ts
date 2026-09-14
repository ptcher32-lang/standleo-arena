import { NextRequest } from "next/server";
import { readStore } from "@/lib/db";
import { json } from "@/lib/http";
import { toPublicUser } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const store = await readStore();
  let players = store.users.filter((u) => !u.banned).map(toPublicUser);
  if (q) {
    players = players.filter(
      (p) => p.nick.toLowerCase().includes(q) || p.publicId.toLowerCase().includes(q),
    );
  }
  players.sort((a, b) => b.mmr - a.mmr);
  return json({ players });
}
