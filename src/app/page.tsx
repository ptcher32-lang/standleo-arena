"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RankBadge } from "@/components/RankBadge";
import { useAuth } from "@/components/AuthProvider";

const MODES = [
  { id: "1v1", title: "Duel", hint: "Чистый аим и психология" },
  { id: "2v2", title: "Pairs", hint: "Связка и трейды" },
  { id: "3v3", title: "Trio", hint: "Темп и роли" },
  { id: "5v5", title: "Full", hint: "Классический ранг" },
];

type HomeData = {
  online: number;
  registered: number;
  live: number;
  recent: { id: string; mode: string; scoreA: number; scoreB: number; winner: string; teamA: { userId: string }[]; teamB: { userId: string }[] }[];
  top: { id: string; nick: string; avatarHue: number; avatarUrl?: string; mmr: number }[];
  usersById: Record<string, { nick: string; avatarHue: number; avatarUrl?: string }>;
};

export default function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/home").then((r) => r.json()).then(setData);
    load();
    const refresh = window.setInterval(load, 20_000);
    return () => window.clearInterval(refresh);
  }, []);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-ink-900 p-8 md:p-14">
        <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:32px_32px] opacity-40" />
        <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div className="animate-rise">
            <p className="text-xs uppercase tracking-[0.4em] text-accent">STANDLEO LITE</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-6xl">
              Арена, где MMR
              <span className="block text-accent">говорит громче ника</span>
            </h1>
            <p className="mt-5 max-w-xl text-white/60">
              Оригинальная рейтинговая платформа для STANDLEO LITE. Очереди 1v1–5v5, прозрачные звания, живой рейтинг.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/play" className="btn-primary">
                Играть
              </Link>
              <Link href="/ranking" className="btn-ghost">
                Рейтинг
              </Link>
              {!user ? (
                <>
                  <Link href="/register" className="btn-ghost">
                    Регистрация
                  </Link>
                  <Link href="/login" className="btn-ghost">
                    Вход
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="glass rounded-3xl p-5">
              <p className="text-xs uppercase tracking-widest text-white/40">Онлайн сейчас</p>
              <p className="mt-2 text-4xl font-semibold text-accent">{data?.online ?? "—"}</p>
              <p className="text-sm text-white/40">{data?.registered ?? 0} игроков в арене</p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="text-xs uppercase tracking-widest text-white/40">Живые матчи</p>
              <p className="mt-2 text-4xl font-semibold">{data?.live ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Популярные режимы</h2>
          <Link href="/play" className="text-sm text-accent">
            В очередь
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {MODES.map((m) => (
            <Link key={m.id} href="/play" className="glass card-hover rounded-3xl p-5">
              <p className="text-3xl font-display text-volt">{m.id}</p>
              <p className="mt-2 font-medium">{m.title}</p>
              <p className="text-sm text-white/50">{m.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Последние матчи</h2>
          <div className="space-y-3">
            {(data?.recent ?? []).map((m) => {
              const a = data?.usersById[m.teamA[0]?.userId ?? ""];
              const b = data?.usersById[m.teamB[0]?.userId ?? ""];
              return (
                <Link key={m.id} href={`/matches/${m.id}`} className="glass card-hover flex items-center justify-between rounded-2xl px-4 py-3">
                  <span className="text-xs uppercase tracking-widest text-white/40">{m.mode}</span>
                  <span className="text-sm">
                    {a?.nick ?? "A"} <span className="text-white/40">vs</span> {b?.nick ?? "B"}
                  </span>
                  <span className="font-semibold">
                    {m.scoreA}:{m.scoreB}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold">Топ игроков</h2>
          <div className="space-y-3">
            {(data?.top ?? []).map((p, i) => (
              <Link key={p.id} href={`/players/${p.id}`} className="glass card-hover flex items-center gap-3 rounded-2xl px-4 py-3">
                <span className="w-6 text-white/30">#{i + 1}</span>
                <PlayerAvatar nick={p.nick} hue={p.avatarHue} avatarUrl={p.avatarUrl} size={36} />
                <div className="flex-1">
                  <p className="font-medium">{p.nick}</p>
                  <RankBadge mmr={p.mmr} size="sm" />
                </div>
                <span className="text-accent">{p.mmr}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
