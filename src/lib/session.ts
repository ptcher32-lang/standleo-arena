import { cookies } from "next/headers";
import { randomToken } from "./crypto";
import { readStore, reloadStore, updateStore } from "./db";
import type { User } from "./types";

const COOKIE = "standleo_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 14;
const COOKIE_SECURE = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
const DEVICE_COOKIE = "standleo_device";

async function getDeviceId(): Promise<string> {
  const jar = await cookies();
  const current = jar.get(DEVICE_COOKIE)?.value;
  if (current) return current;
  const deviceId = randomToken(24);
  jar.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
    secure: COOKIE_SECURE,
  });
  return deviceId;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  const deviceId = await getDeviceId();
  await updateStore((store) => {
    store.sessions = store.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
    store.sessions.push({
      token,
      userId,
      deviceId,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + TTL_MS).toISOString(),
    });
  });
  return token;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
    secure: COOKIE_SECURE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const store = await readStore();
  const deviceId = jar.get(DEVICE_COOKIE)?.value;
  if (deviceId && store.deviceBans?.some((ban) => ban.deviceId === deviceId)) return null;
  let session = store.sessions.find((s) => s.token === token && new Date(s.expiresAt).getTime() > Date.now());
  if (!session) {
    const freshStore = await reloadStore();
    if (deviceId && freshStore.deviceBans?.some((ban) => ban.deviceId === deviceId)) return null;
    session = freshStore.sessions.find((s) => s.token === token && new Date(s.expiresAt).getTime() > Date.now());
    if (!session) return null;
    const freshUser = freshStore.users.find((u) => u.id === session?.userId);
    if (!freshUser || freshUser.banned) return null;
    return freshUser;
  }
  if (!session) return null;
  const user = store.users.find((u) => u.id === session.userId);
  if (!user || user.banned) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await updateStore((store) => {
      store.sessions = store.sessions.filter((s) => s.token !== token);
    });
  }

  await clearSessionCookie();
}

export async function getCurrentDeviceId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(DEVICE_COOKIE)?.value ?? null;
}

export async function switchSession(userId: string): Promise<User> {
  const current = await requireUser();
  const deviceId = await getCurrentDeviceId();
  if (!deviceId) throw new Error("UNAUTHORIZED");
  const store = await readStore();
  const session = store.sessions.find(
    (item) =>
      item.userId === userId &&
      item.deviceId === deviceId &&
      new Date(item.expiresAt).getTime() > Date.now(),
  );
  const user = store.users.find((item) => item.id === userId);
  if (!session || !user || user.banned) throw new Error("FORBIDDEN");
  if (current.id === user.id) return user;
  await setSessionCookie(session.token);
  return user;
}
