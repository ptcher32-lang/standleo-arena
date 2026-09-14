"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RankBadge } from "@/components/RankBadge";

function isVideoFrame(url?: string) {
  return Boolean(url && (url.startsWith("data:video/") || /\.(mp4|webm|mov|ogv)(?:$|[?#])/i.test(url)));
}

type Player = {
  id: string;
  nick: string;
  avatarHue: number;
  avatarUrl?: string;
  rankFrameUrl?: string;
  bio?: string;
  stickers?: string[];
  verified?: boolean;
  role: "user" | "admin";
  mmr: number;
  winRate: number;
  matchesPlayed: number;
  online: boolean;
};

export default function PlayersPage() {
  const [q, setQ] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const load = () => {
      fetch(`/api/players?q=${encodeURIComponent(q)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setPlayers(d.players ?? []));
    };
    const delay = setTimeout(load, 200);
    const refresh = setInterval(load, 20_000);
    return () => {
      clearTimeout(delay);
      clearInterval(refresh);
    };
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Roster</p>
        <h1 className="font-display text-4xl">Игроки</h1>
      </div>
      <input className="field max-w-md" placeholder="Поиск по нику" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <Link key={p.id} href={`/players/${p.id}`} className="glass card-hover relative rounded-3xl p-5">
            {p.rankFrameUrl ? (
              isVideoFrame(p.rankFrameUrl) ? (
                <video className="player-card-frame" src={p.rankFrameUrl} autoPlay loop muted playsInline preload="none" aria-hidden />
              ) : (
                <img className="player-card-frame" src={p.rankFrameUrl} alt="" loading="lazy" decoding="async" />
              )
            ) : null}
            <div className="flex items-center gap-3">
              <PlayerAvatar nick={p.nick} hue={p.avatarHue} avatarUrl={p.avatarUrl} size={48} online={p.online} />
              <div>
                <p className="flex items-center gap-1 font-semibold">
                  {p.nick}
                  {p.verified ? <span className="verified-badge" title="Проверенный игрок" aria-label="Проверенный игрок">✓</span> : null}
                  {p.role === "admin" ? <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">ADMIN</span> : null}
                </p>
                <RankBadge mmr={p.mmr} size="sm" />
              </div>
            </div>
            {p.bio ? <p className="mt-3 line-clamp-2 text-sm text-white/55">{p.bio}</p> : null}
            <div className="mt-4 flex justify-between text-sm text-white/50">
              <span>{p.mmr} MMR</span>
              <span>{p.winRate}% WR</span>
              <span>{p.matchesPlayed} матчей</span>
              <span>{p.stickers?.length ?? 0} стикеров</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
