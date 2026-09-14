"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function NewsArticlePage() {
  const params = useParams<{ id: string }>();
  const [article, setArticle] = useState<{ title: string; content: string; cover: string; createdAt: string; author: string } | null>(null);
  useEffect(() => {
    fetch(`/api/news?id=${params.id}`)
      .then((r) => r.json())
      .then((d) => setArticle(d.article));
  }, [params.id]);
  if (!article) return <p>Загрузка...</p>;
  return (
    <article className="mx-auto max-w-3xl">
      <div className="h-48 rounded-[28px]" style={{ background: article.cover }} />
      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/40">
        {article.author} · {new Date(article.createdAt).toLocaleDateString("ru")}
      </p>
      <h1 className="mt-2 font-display text-4xl">{article.title}</h1>
      <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed text-white/70">{article.content}</p>
    </article>
  );
}
