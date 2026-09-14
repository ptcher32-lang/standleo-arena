import { NextRequest } from "next/server";
import { verifyPassword } from "@/lib/crypto";
import { readStore, updateStore } from "@/lib/db";
import { clientIp, error, handleError, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { createSession, setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`login:${clientIp(request)}`, 12, 60_000)) {
      return error("Too many attempts", 429);
    }
    const body = parseBody(loginSchema, await request.json());
    const store = await readStore();
    const deviceToken = request.cookies.get("standleo_device")?.value;
    if (deviceToken && store.deviceBans?.some((ban) => ban.deviceId === deviceToken)) {
      return error("This device is blocked", 403);
    }
    const user = store.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase());
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return error("Invalid credentials", 401);
    }
    if (user.banned) return error("Account is locked", 403);
    await updateStore((s) => {
      const u = s.users.find((item) => item.id === user.id);
      if (u) {
        u.online = true;
        u.lastSeen = new Date().toISOString();
      }
    });
    const token = await createSession(user.id);
    await setSessionCookie(token);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
