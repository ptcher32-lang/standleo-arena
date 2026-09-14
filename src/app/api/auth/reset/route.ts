import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/crypto";
import { updateStore } from "@/lib/db";
import { clientIp, error, handleError, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { resetSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`reset:${clientIp(request)}`, 8, 60_000)) {
      return error("Too many attempts", 429);
    }
    const body = parseBody(resetSchema, await request.json());
    const ok = await updateStore((store) => {
      const reset = store.resets.find(
        (r) => r.token === body.token && !r.used && new Date(r.expiresAt).getTime() > Date.now(),
      );
      if (!reset) return false;
      const user = store.users.find((u) => u.id === reset.userId);
      if (!user) return false;
      user.passwordHash = hashPassword(body.password);
      reset.used = true;
      store.sessions = store.sessions.filter((session) => session.userId !== user.id);
      return true;
    });
    if (!ok) return error("Invalid or expired token", 400);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
