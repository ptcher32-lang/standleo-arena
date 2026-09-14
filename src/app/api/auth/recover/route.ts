import { NextRequest } from "next/server";
import { randomToken } from "@/lib/crypto";
import { updateStore } from "@/lib/db";
import { clientIp, error, handleError, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { recoverSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`recover:${clientIp(request)}`, 6, 60_000)) {
      return error("Too many attempts", 429);
    }
    const body = parseBody(recoverSchema, await request.json());
    const token = await updateStore((store) => {
      const user = store.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase());
      if (!user) return null;
      const t = randomToken(32);
      store.resets.push({
        token: t,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        used: false,
      });
      return t;
    });
    const response: { ok: true; message: string; mockToken?: string } = {
      ok: true,
      message: "If the email exists, a reset token was issued.",
    };
    if (process.env.RESET_TOKEN_DEBUG === "true" && token) response.mockToken = token;
    return json(response);
  } catch (err) {
    return handleError(err);
  }
}
