import { NextResponse } from "next/server";
import { getCurrentDeviceId, requireUser } from "@/lib/session";
import { readStore } from "@/lib/db";
import { toPublicUser } from "@/lib/serialize";
import { handleError } from "@/lib/http";

export async function GET() {
  try {
    const current = await requireUser();
    const deviceId = await getCurrentDeviceId();
    if (!deviceId) return NextResponse.json({ accounts: [] });
    const store = await readStore();
    const userIds = new Set(
      store.sessions
        .filter((session) => session.deviceId === deviceId && new Date(session.expiresAt).getTime() > Date.now())
        .map((session) => session.userId),
    );
    userIds.add(current.id);
    return NextResponse.json({
      accounts: store.users.filter((user) => userIds.has(user.id) && !user.banned).map(toPublicUser),
    });
  } catch (error) {
    return handleError(error);
  }
}
