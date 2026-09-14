"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Article = { id: string; title: string; excerpt: string; cover: string; createdAt: string };

export default function NewsPage() {
  const [news, setNews] = useState<Article[]>([]);
  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((d) => setNews(d.news ?? []));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Feed</p>
        <h1 className="font-display text-4xl">Новости</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {news.map((n) => (
          <Link key={n.id} href={`/news/${n.id}`} className="glass card-hover overflow-hidden rounded-3xl">
            <div className="h-32" style={{ background: n.cover }} />
            <div className="p-5">
              <p className="text-xs text-white/40">{new Date(n.createdAt).toLocaleDateString("ru")}</p>
              <h2 className="mt-1 text-lg font-semibold">{n.title}</h2>
              <p className="mt-2 text-sm text-white/50">{n.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
