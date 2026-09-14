"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RankProgressBar } from "@/components/RankBadge";

const MODES = ["1v1", "2v2", "3v3", "5v5"] as const;
const PLATFORMS = [
  { id: "mobile", label: "Телефон", hint: "Только против игроков с телефона" },
  { id: "pc", label: "ПК", hint: "Только против игроков с ПК" },
] as const;
const MAPS = ["Sandstone", "Rust", "Province"] as const;

export default function PlayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number]>("1v1");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]["id"]>("mobile");
  const [map, setMap] = useState<(typeof MAPS)[number]>("Sandstone");
  const [queue, setQueue] = useState<{ id: string; startedAt: string; found: number; needed: number; matchId?: string } | null>(null);
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/matches/search", { cache: "no-store", credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (data.queue) {
          setQueue(data.queue);
          setRange(data.range);
          setElapsed(Math.floor((Date.now() - new Date(data.queue.startedAt).getTime()) / 1000));
          if (data.queue.matchId) router.push(`/matches/${data.queue.matchId}`);
        }
      });
  }, [user, router]);

  useEffect(() => {
    if (!queue || queue.matchId) return;
    const t = setInterval(async () => {
      const res = await fetch("/api/matches/search");
      const data = await res.json();
      setQueue(data.queue);
      setRange(data.range);
      if (data.queue?.matchId) router.push(`/matches/${data.queue.matchId}`);
    }, 800);
    return () => clearInterval(t);
  }, [queue, router]);

  useEffect(() => {
    if (!queue) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - new Date(queue.startedAt).getTime()) / 1000)), 250);
    return () => clearInterval(t);
  }, [queue]);

  async function findMatch() {
    try {
      const res = await fetch("/api/matches/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ mode, platform, map }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.queue) {
        setSearchMessage(data.error ?? "Не удалось начать поиск");
        return;
      }
      setSearchMessage("");
      setQueue(data.queue);
      setRange(data.range);
      setElapsed(0);
    } catch {
      setQueue(null);
      setSearchMessage("Ошибка соединения с сервером");
    }
  }

  async function cancel() {
    await fetch("/api/matches/search", { method: "DELETE" });
    setQueue(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Matchmaking</p>
        <h1 className="mt-2 font-display text-4xl">Играть</h1>
        <p className="mt-2 text-white/50">Выбери платформу, режим и карту. В матч попадут игроки только с такой же платформой.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setPlatform(item.id)}
            className={`min-h-16 rounded-2xl border px-4 py-3 text-left touch-manipulation ${platform === item.id ? "border-accent bg-accent/10 text-accent" : "border-white/10 bg-white/5"}`}
          >
            <span className="block font-display text-xl">{item.label}</span>
            <span className="mt-1 block text-xs text-white/45">{item.hint}</span>
          </button>
        ))}
      </div>
      {user ? (
        <div className="glass rounded-3xl p-6">
          <RankProgressBar mmr={user.mmr} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`min-h-14 rounded-2xl border px-4 py-4 text-xl font-display touch-manipulation ${mode === m ? "border-accent bg-accent/10 text-accent" : "border-white/10 bg-white/5"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {MAPS.map((item) => (
          <button
            key={item}
            onClick={() => setMap(item)}
            className={`min-h-14 rounded-2xl border px-3 py-4 font-display touch-manipulation ${map === item ? "border-accent bg-accent/10 text-accent" : "border-white/10 bg-white/5"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {!queue ? (
        <>
          <button onClick={findMatch} className="btn-primary w-full py-4 text-base">
            Найти матч
          </button>
          {searchMessage ? <p className="text-center text-sm text-rose-300">{searchMessage}</p> : null}
        </>
      ) : (
        <div className="glass space-y-4 rounded-3xl p-6 text-center">
          <p className="text-lg font-medium">Поиск игроков...</p>
          <p className="font-display text-4xl text-accent">
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(elapsed % 60).toString().padStart(2, "0")}
          </p>
          <p className="text-white/60">
            Найдено {queue.found} из {queue.needed}
          </p>
          {range ? (
            <p className="text-sm text-white/40">
              Диапазон MMR: {range.min}–{range.max}
            </p>
          ) : null}
          <button onClick={cancel} className="btn-ghost">
            Отменить поиск
          </button>
        </div>
      )}
    </div>
  );
}
