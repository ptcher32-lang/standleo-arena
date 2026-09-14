import { NextRequest } from "next/server";
import { hashPassword, publicIdFromSeed } from "@/lib/crypto";
import { readStore, updateStore } from "@/lib/db";
import { clientIp, error, handleError, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { createSession, setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`reg:${clientIp(request)}`, 8, 60_000)) {
      return error("Too many attempts", 429);
    }
    const body = parseBody(registerSchema, await request.json());
    const deviceToken = request.cookies.get("standleo_device")?.value;
    if (deviceToken) {
      const store = await readStore();
      if (store.deviceBans?.some((ban) => ban.deviceId === deviceToken)) {
        return error("This device is blocked", 403);
      }
    }
    const user = await updateStore((store) => {
      if (store.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
        throw new Error("EMAIL_TAKEN");
      }
      if (store.users.some((u) => u.nick.toLowerCase() === body.nick.toLowerCase())) {
        throw new Error("NICK_TAKEN");
      }
      const now = new Date().toISOString();
      const created = {
        id: `u_${crypto.randomUUID().slice(0, 8)}`,
        publicId: publicIdFromSeed(`${body.email}:${now}`),
        email: body.email.toLowerCase(),
        passwordHash: hashPassword(body.password),
        nick: body.nick,
        avatarHue: Math.floor(Math.random() * 360),
        createdAt: now,
        role: "user" as const,
        banned: false,
        mmr: 0,
        peakMmr: 0,
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        winStreak: 0,
        currentStreak: 0,
        mmrHistory: [{ at: now, mmr: 0 }],
        achievements: ["founder"],
        online: true,
        lastSeen: now,
      };
      store.users.push(created);
      store.notifications.unshift({
        id: `nt_${crypto.randomUUID().slice(0, 8)}`,
        userId: created.id,
        type: "achievement",
        title: "Welcome to STANDLEO",
        body: "Founder badge unlocked. You start at 0 MMR — Bronze 1.",
        read: false,
        createdAt: now,
        href: "/profile",
      });
      return created;
    });
    const token = await createSession(user.id);
    await setSessionCookie(token);
    return json({ ok: true, id: user.id }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") return error("Email already registered", 409);
    if (err instanceof Error && err.message === "NICK_TAKEN") return error("Nick is taken", 409);
    return handleError(err);
  }
}
