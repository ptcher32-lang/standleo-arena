"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RankBadge } from "@/components/RankBadge";
import { useAuth } from "@/components/AuthProvider";

type Slot = {
  userId: string;
  kills: number;
  deaths: number;
  assists: number;
  mmrBefore: number;
  mmrDelta: number;
  mmrAfter: number;
  rankBefore: string;
  rankAfter: string;
};

type Match = {
  id: string;
  mode: string;
  map?: string;
  status: string;
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | null;
  mvpId?: string;
  proofAttached?: boolean;
  proofUrl?: string;
  teamA: Slot[];
  teamB: Slot[];
};

type Pub = { nick: string; avatarHue: number; avatarUrl?: string; mmr: number };

export default function MatchPage() {
  const params = useParams<{ id: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [users, setUsers] = useState<Record<string, Pub>>({});
  const { user } = useAuth();
  const [proofMessage, setProofMessage] = useState("");

  async function load() {
    const res = await fetch(`/api/matches/${params.id}`, { cache: "no-store" });
    const data = await res.json();
    setMatch(data.match);
    setUsers(data.users ?? {});
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [params.id]);

  if (!match) return <p>Загрузка...</p>;

  const teamBlock = (label: string, slots: Slot[], win: boolean, side: "left" | "right") => (
    <section className={`rounded-3xl border bg-white/[0.035] p-4 md:p-5 ${win ? "border-accent/50 shadow-[0_0_35px_rgba(125,255,179,0.08)]" : "border-white/10"}`}>
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${win ? "text-accent" : "text-white/35"}`}>{win ? "Победитель" : "Команда"}</p>
          <h2 className="mt-1 font-display text-2xl">{label}</h2>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl font-bold ${win ? "bg-accent/15 text-accent" : "bg-white/5 text-white/40"}`}>
          {side === "left" ? "A" : "B"}
        </div>
      </div>
      <div className="space-y-3">
        {slots.map((s) => {
          const p = users[s.userId];
          return (
            <Link key={s.userId} href={`/players/${s.userId}`} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3 transition hover:border-accent/30 hover:bg-white/[0.07]">
              <PlayerAvatar nick={p?.nick ?? "?"} hue={p?.avatarHue ?? 120} avatarUrl={p?.avatarUrl} size={48} />
              <div className="flex-1">
                <p className="font-semibold">
                  {p?.nick ?? "Игрок"} {match.mvpId === s.userId ? <span className="ml-1 rounded-full bg-volt/15 px-2 py-0.5 text-xs text-volt">MVP</span> : null}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <RankBadge mmr={match.status === "completed" ? s.mmrAfter : s.mmrBefore} size="sm" />
                  <span className="text-xs text-white/35">{match.status === "completed" ? `${s.mmrAfter} MMR` : `${s.mmrBefore} MMR`}</span>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">{s.kills} <span className="text-white/30">K</span> <span className="text-white/50">/</span> {s.deaths} <span className="text-white/30">D</span> <span className="text-white/50">/</span> {s.assists} <span className="text-white/30">A</span></p>
                {match.status === "completed" ? (
                  <p className={`mt-1 text-xs ${s.mmrDelta >= 0 ? "text-accent" : "text-rose-400"}`}>
                    {s.mmrDelta >= 0 ? "+" : ""}
                    {s.mmrDelta} · {s.mmrAfter}
                    {s.rankAfter !== s.rankBefore ? ` · ${s.rankAfter}` : ""}
                  </p>
                ) : (
                  <p className="text-white/40">{s.mmrBefore} MMR</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-accent/10 via-white/[0.03] to-transparent p-6 text-center md:p-10">
        <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-accent">История матча · {match.mode}{match.map ? ` · ${match.map}` : ""}</p>
        <h1 className="relative mt-3 font-display text-3xl font-bold md:text-5xl">
          КОМАНДА A <span className="mx-2 text-white/20">VS</span> КОМАНДА B
        </h1>
        <div className="relative mt-6 flex items-center justify-center gap-5 md:gap-8">
          <span className={`font-display text-6xl font-bold ${match.winner === "A" ? "text-accent" : "text-white/60"}`}>{match.scoreA}</span>
          <span className="text-2xl text-white/20">:</span>
          <span className={`font-display text-6xl font-bold ${match.winner === "B" ? "text-accent" : "text-white/60"}`}>{match.scoreB}</span>
        </div>
        {match.status === "live" ? (
          <p className="relative mt-4 text-sm text-white/50">Матч сыгран · результат ожидает подтверждения</p>
        ) : (
          <p className="relative mt-4 text-sm text-accent">
            Матч завершён{match.proofAttached ? " · результат подтверждён скриншотом автоматически" : ""}
          </p>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {teamBlock("Команда A", match.teamA, match.winner === "A", "left")}
        {teamBlock("Команда B", match.teamB, match.winner === "B", "right")}
      </div>
      {match.status === "live" && user && [...match.teamA, ...match.teamB].some((slot) => slot.userId === user.id) ? (
        <section className="rounded-3xl border border-accent/20 bg-accent/5 p-5">
          <h2 className="font-display text-2xl">Результат матча</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            После отправки скрина система распознает счёт и ник победителя, завершит матч и добавит результат в историю.
          </p>
          <label className="btn-primary mt-4 inline-block cursor-pointer text-sm">
            Отправить скрин результата
            <input
              className="hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setProofMessage("Загружаем скриншот...");
                try {
                  const form = new FormData();
                  form.append("proof", file);
                  const response = await fetch(`/api/matches/${match.id}`, { method: "PATCH", body: form, credentials: "same-origin" });
                  const data = await response.json().catch(() => ({}));
                  setProofMessage(response.ok ? (data.match?.status === "completed" ? "Готово: матч завершён автоматически" : "Скриншот загружен, но ник победителя не распознан") : data.error ?? "Не удалось отправить скриншот");
                  if (response.ok) setMatch(data.match);
                } catch {
                  setProofMessage("Ошибка соединения с сервером. Повтори загрузку скрина.");
                }
              }}
            />
          </label>
          {match.proofUrl ? <p className="mt-3 text-sm text-accent">Скриншот уже загружен.</p> : null}
          {proofMessage ? <p className="mt-3 text-sm text-white/70">{proofMessage}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
