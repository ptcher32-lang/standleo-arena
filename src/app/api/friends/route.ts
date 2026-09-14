import { NextRequest } from "next/server";
import { randomToken } from "@/lib/crypto";
import { readStore, updateStore } from "@/lib/db";
import { error, handleError, json, parseBody } from "@/lib/http";
import { toPublicUser } from "@/lib/serialize";
import { requireUser } from "@/lib/session";
import { friendActionSchema, friendRequestSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function GET() {
  try {
    const user = await requireUser();
    const store = await readStore();
    const friends = store.friendships
      .filter((f) => f.a === user.id || f.b === user.id)
      .map((f) => (f.a === user.id ? f.b : f.a))
      .map((id) => store.users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => toPublicUser(u!));
    const incoming = store.friendRequests
      .filter((r) => r.toId === user.id && r.status === "pending")
      .map((r) => ({ ...r, from: toPublicUser(store.users.find((u) => u.id === r.fromId)!) }));
    const outgoing = store.friendRequests.filter((r) => r.fromId === user.id && r.status === "pending");
    return json({ friends, incoming, outgoing });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!rateLimit(`friends:${user.id}`, 30, 60_000)) return error("Too many requests", 429);
    const body = parseBody(friendRequestSchema, await request.json());
    if (body.toId === user.id) return error("Cannot add yourself", 400);
    const created = await updateStore((store) => {
      const target = store.users.find((u) => u.id === body.toId || u.nick.toLowerCase() === body.toId.toLowerCase());
      if (!target || target.banned) throw new Error("NOT_FOUND");
      const exists = store.friendships.some(
        (f) => (f.a === user.id && f.b === target.id) || (f.a === target.id && f.b === user.id),
      );
      if (exists) throw new Error("ALREADY");
      const pending = store.friendRequests.find(
        (r) =>
          r.status === "pending" &&
          ((r.fromId === user.id && r.toId === target.id) || (r.fromId === target.id && r.toId === user.id)),
      );
      if (pending) throw new Error("PENDING");
      const req = {
        id: `fr_${randomToken(5)}`,
        fromId: user.id,
        toId: target.id,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      store.friendRequests.push(req);
      store.notifications.unshift({
        id: `nt_${randomToken(5)}`,
        userId: target.id,
        type: "friend_request",
        title: "Friend request",
        body: `${user.nick} wants to add you`,
        read: false,
        createdAt: req.createdAt,
        href: "/friends",
      });
      return req;
    });
    return json({ request: created }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return error("Player not found", 404);
    if (err instanceof Error && err.message === "ALREADY") return error("Already friends", 409);
    if (err instanceof Error && err.message === "PENDING") return error("Request already pending", 409);
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!rateLimit(`friends:${user.id}`, 30, 60_000)) return error("Too many requests", 429);
    const body = parseBody(friendActionSchema, await request.json());
    await updateStore((store) => {
      const req = store.friendRequests.find((r) => r.id === body.requestId && r.toId === user.id && r.status === "pending");
      if (!req) throw new Error("NOT_FOUND");
      req.status = body.action === "accept" ? "accepted" : "declined";
      if (body.action === "accept") {
        const exists = store.friendships.some(
          (friendship) =>
            (friendship.a === req.fromId && friendship.b === req.toId) ||
            (friendship.a === req.toId && friendship.b === req.fromId),
        );
        if (!exists) store.friendships.push({ a: req.fromId, b: req.toId, since: new Date().toISOString() });
        const accepter = store.users.find((item) => item.id === user.id);
        store.notifications.unshift({
          id: `nt_${randomToken(5)}`,
          userId: req.fromId,
          type: "friend_request",
          title: "Заявка принята",
          body: `${accepter?.nick ?? "Игрок"} теперь ваш друг`,
          read: false,
          createdAt: new Date().toISOString(),
          href: `/players/${user.id}`,
        });
      }
    });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return error("Request not found", 404);
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!rateLimit(`friends:${user.id}`, 30, 60_000)) return error("Too many requests", 429);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return error("Missing id", 400);
    await updateStore((store) => {
      store.friendships = store.friendships.filter(
        (f) => !((f.a === user.id && f.b === id) || (f.b === user.id && f.a === id)),
      );
    });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
