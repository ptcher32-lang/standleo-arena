import { NextRequest } from "next/server";
import { error, handleError, json, parseBody } from "@/lib/http";
import { cancelSearch, searchRange, startSearch, tickSearch } from "@/lib/matchmaking";
import { requireUser } from "@/lib/session";
import { searchMatchSchema } from "@/lib/validation";
import { readStore } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!rateLimit(`search:${user.id}`, 10, 60_000)) return error("Too many search requests", 429);
    const body = parseBody(searchMatchSchema, await request.json());
    const queue = await startSearch(user.id, body.mode, body.platform, body.map);
    return json({ queue, range: searchRange(user.mmr) }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const store = await readStore();
    const queue = [...store.queues].reverse().find((q) => q.userId === user.id && !q.cancelled);
    if (!queue) return json({ queue: null });
    const ticked = await tickSearch(queue.id);
    return json({ queue: ticked, range: searchRange(user.mmr) });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await cancelSearch(user.id);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
