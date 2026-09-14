import { NextRequest } from "next/server";
import { randomToken } from "@/lib/crypto";
import { updateStore } from "@/lib/db";
import { error, handleError, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { newsPatchSchema, newsSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = parseBody(newsSchema, await request.json());
    const article = await updateStore((store) => {
      const item = {
        id: `n_${randomToken(4)}`,
        title: body.title,
        excerpt: body.excerpt,
        content: body.content,
        cover: body.cover ?? "linear-gradient(135deg,#10141d,#1e2636,#7dffb3)",
        createdAt: new Date().toISOString(),
        author: admin.nick,
      };
      store.news.unshift(item);
      return item;
    });
    return json({ article }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = newsPatchSchema.parse(await request.json());
    const article = await updateStore((store) => {
      const item = store.news.find((n) => n.id === body.id);
      if (!item) throw new Error("NOT_FOUND");
      if (body.title !== undefined) item.title = body.title;
      if (body.excerpt !== undefined) item.excerpt = body.excerpt;
      if (body.content !== undefined) item.content = body.content;
      return item;
    });
    return json({ article });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return error("News not found", 404);
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return error("Missing id", 400);
    await updateStore((store) => {
      store.news = store.news.filter((n) => n.id !== id);
    });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
