"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/components/AuthProvider";

type Slot = {
  userId: string;
  ping?: number;
  money?: number;
  kills: number;
  deaths: number;
  assists: number;
};

type Match = {
  id: string;
  mode: string;
  map?: string;
  status: string;
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | null;
  createdAt: string;
  mvpId?: string;
  teamA: Slot[];
  teamB: Slot[];
};

type Pub = { nick: string; avatarHue: number; avatarUrl?: string };

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<Record<string, Pub>>({});
  useEffect(() => {
    if (!user) return;
    fetch("/api/matches", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setMatches(data.matches ?? []);
        setUsers(data.users ?? {});
      });
  }, [user]);

  const playerRow = (slot: Slot) => {
    const player = users[slot.userId];
    return (
      <Link
        key={slot.userId}
        href={`/players/${slot.userId}`}
        className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0 hover:bg-white/[0.06]"
      >
        <PlayerAvatar nick={player?.nick ?? "?"} hue={player?.avatarHue ?? 120} avatarUrl={player?.avatarUrl} size={42} />
        <span className="min-w-0 flex-1 truncate font-semibold">{player?.nick ?? "Игрок"}</span>
        {matches[0]?.mvpId === slot.userId ? <span className="text-xs text-volt">★ MVP</span> : null}
        <span className="w-44 text-right font-mono text-xs text-white/75">
          <span className="mr-3 text-white/40">{slot.ping ?? "--"} ping</span>
          <span className="mr-3 text-white/50">${slot.money ?? 0}</span>
          <b>{slot.kills}</b> <span className="text-white/30">K</span>{" "}
          <b>{slot.deaths}</b> <span className="text-white/30">D</span>{" "}
          <b>{slot.assists}</b> <span className="text-white/30">A</span>
        </span>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Match history</p>
          <h1 className="mt-2 font-display text-4xl">История матчей</h1>
        </div>
        {user ? <span className="text-sm text-white/45">Только мои матчи</span> : null}
      </div>

      {!user ? <p className="glass rounded-2xl p-5 text-white/60">Войди в аккаунт, чтобы увидеть историю своих матчей.</p> : null}
      {user && matches.length === 0 ? <p className="glass rounded-2xl p-5 text-white/60">У тебя пока нет сыгранных матчей.</p> : null}
      {matches.map((match) => {
        const pending = match.status !== "completed";
        return (
          <article key={match.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#10151f] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">{match.mode} · {match.map ?? "Sandstone"}</p>
                <p className="mt-1 text-sm text-white/60">{new Date(match.createdAt).toLocaleString("ru")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pending ? "bg-amber-400/10 text-amber-300" : "bg-accent/10 text-accent"}`}>
                {pending ? "Ожидает результата" : "Завершён"}
              </span>
            </div>
            <div className="grid lg:grid-cols-[1fr_auto_1fr]">
              <section className={`border-b p-4 lg:border-b-0 lg:border-r ${match.winner === "A" ? "border-accent/40 bg-accent/[0.04]" : "border-white/10"}`}>
                <div className="mb-2 flex items-center justify-between px-4">
                  <h2 className="font-display text-xl text-sky-300">СПЕЦНАЗ</h2>
                  <span className="font-display text-4xl font-bold text-sky-300">{match.scoreA}</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="grid grid-cols-[1fr_176px] border-b border-white/10 px-4 py-2 text-[10px] uppercase tracking-widest text-white/30">
                    <span>Игрок</span><span className="text-right">PING · ДЕНЬГИ · K / D / A</span>
                  </div>
                  {match.teamA.map(playerRow)}
                </div>
              </section>
              <div className="flex items-center justify-center border-b border-white/10 px-8 py-3 text-2xl font-bold text-white/20 lg:border-b-0">VS</div>
              <section className={`p-4 ${match.winner === "B" ? "bg-rose-400/[0.04]" : ""}`}>
                <div className="mb-2 flex items-center justify-between px-4">
                  <h2 className="font-display text-xl text-orange-300">ТЕРРОРИСТЫ</h2>
                  <span className="font-display text-4xl font-bold text-orange-300">{match.scoreB}</span>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="grid grid-cols-[1fr_176px] border-b border-white/10 px-4 py-2 text-[10px] uppercase tracking-widest text-white/30">
                    <span>Игрок</span><span className="text-right">PING · ДЕНЬГИ · K / D / A</span>
                  </div>
                  {match.teamB.map(playerRow)}
                </div>
              </section>
            </div>
          </article>
        );
      })}
    </div>
  );
}
