import { NextRequest } from "next/server";
import { error, json } from "@/lib/http";
import { getRankProgress } from "@/lib/ranks";
import { readStore } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const store = await readStore();
  const me = await getSessionUser();
  const user = id ? store.users.find((u) => u.id === id) : me;
  if (!user) return error("Player not found", 404);
  return json({ ...getRankProgress(user.mmr), mmr: user.mmr, peakMmr: user.peakMmr });
}
