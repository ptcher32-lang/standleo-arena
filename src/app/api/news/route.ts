import { NextRequest } from "next/server";
import { readStore } from "@/lib/db";
import { error, json } from "@/lib/http";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const store = await readStore();
  if (id) {
    const article = store.news.find((n) => n.id === id);
    if (!article) return error("News not found", 404);
    return json({ article });
  }
  return json({ news: [...store.news].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}
