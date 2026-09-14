import { NextRequest } from "next/server";
import { readStore } from "@/lib/db";

const fields = new Set(["avatarUrl", "rankFrameUrl", "avatarFrameUrl"]);

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const field = request.nextUrl.searchParams.get("field");
  if (!userId || !field || !fields.has(field)) {
    return new Response("Not found", { status: 404 });
  }

  const store = await readStore();
  const user = store.users.find((item) => item.id === userId);
  const value = user?.[field as "avatarUrl" | "rankFrameUrl" | "avatarFrameUrl"];
  const match = value?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
