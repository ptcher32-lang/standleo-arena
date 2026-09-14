import { NextRequest } from "next/server";
import { handleError, json } from "@/lib/http";
import { readStore, updateStore } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    const store = await readStore();
    const pendingRequests = store.friendRequests
      .filter((request) => request.toId === user.id && request.status === "pending")
      .map((request) => {
        const sender = store.users.find((item) => item.id === request.fromId);
        return {
          id: `friend-request-${request.id}`,
          userId: user.id,
          type: "friend_request" as const,
          title: "Новая заявка в друзья",
          body: `${sender?.nick ?? "Игрок"} хочет добавить вас в друзья`,
          read: false,
          createdAt: request.createdAt,
          href: "/friends",
        };
      });
    const existing = store.notifications.filter((n) => n.userId === user.id);
    const items = [...pendingRequests, ...existing].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 40);
    return json({ notifications: items, unread: items.filter((n) => !n.read).length });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { ids } = (await request.json()) as { ids?: string[] };
    await updateStore((store) => {
      store.notifications.forEach((n) => {
        if (n.userId === user.id && (!ids || ids.includes(n.id))) n.read = true;
      });
    });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
