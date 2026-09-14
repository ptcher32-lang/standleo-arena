import { NextRequest } from "next/server";
import { readStore } from "@/lib/db";
import { error, json } from "@/lib/http";
import { toPublicUser } from "@/lib/serialize";
import { getSessionUser } from "@/lib/session";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = await readStore();
  const user = store.users.find((u) => u.id === id || u.publicId === id || u.nick.toLowerCase() === id.toLowerCase());
  if (!user || user.banned) return error("Player not found", 404);
  const matches = store.matches.filter(
    (m) => m.status === "completed" && [...m.teamA, ...m.teamB].some((p) => p.userId === user.id),
  );
  const friends = store.friendships
    .filter((f) => f.a === user.id || f.b === user.id)
    .map((f) => (f.a === user.id ? f.b : f.a))
    .map((fid) => store.users.find((u) => u.id === fid))
    .filter(Boolean)
    .map((u) => toPublicUser(u!));
  const viewer = await getSessionUser();
  let relationship: "self" | "friend" | "pending" | "none" = "none";
  if (viewer?.id === user.id) relationship = "self";
  else if (viewer) {
    const isFriend = store.friendships.some(
      (friendship) =>
        (friendship.a === viewer.id && friendship.b === user.id) ||
        (friendship.a === user.id && friendship.b === viewer.id),
    );
    const isPending = store.friendRequests.some(
      (request) =>
        request.status === "pending" &&
        ((request.fromId === viewer.id && request.toId === user.id) ||
          (request.fromId === user.id && request.toId === viewer.id)),
    );
    relationship = isFriend ? "friend" : isPending ? "pending" : "none";
  }
  return json({ player: toPublicUser(user), matches, friends, relationship });
}
