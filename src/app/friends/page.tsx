"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/components/AuthProvider";

type Friend = { id: string; nick: string; avatarHue: number; avatarUrl?: string; online: boolean; mmr: number };
type Incoming = { id: string; from: Friend };

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/friends");
    const data = await res.json();
    setFriends(data.friends ?? []);
    setIncoming(data.incoming ?? []);
  }

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!user) return;
    load();
    const refresh = window.setInterval(load, 20_000);
    return () => window.clearInterval(refresh);
  }, [user, loading, router]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Social</p>
        <h1 className="font-display text-4xl">Друзья</h1>
      </div>
      <form
        className="flex max-w-lg flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/friends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ toId: nick }),
          });
          const data = await res.json();
          setMsg(res.ok ? "Заявка отправлена" : data.error);
          setNick("");
          load();
        }}
      >
        <input className="field" placeholder="Ник или ID" value={nick} onChange={(e) => setNick(e.target.value)} />
        <button className="btn-primary min-h-11 sm:shrink-0">Добавить</button>
      </form>
      {msg ? <p className="text-sm text-accent">{msg}</p> : null}

      <section>
        <h2 className="mb-3 font-medium">Заявки</h2>
        <div className="space-y-2">
          {incoming.map((r) => (
            <div key={r.id} className="glass flex items-center justify-between rounded-2xl p-3">
              <Link href={`/players/${r.from.id}`} className="flex items-center gap-2">
                <PlayerAvatar nick={r.from.nick} hue={r.from.avatarHue} avatarUrl={r.from.avatarUrl} size={32} />
                {r.from.nick}
              </Link>
              <div className="flex gap-2">
                <button
                  className="btn-primary px-3 py-1 text-xs"
                  onClick={async () => {
                    await fetch("/api/friends", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ requestId: r.id, action: "accept" }),
                    });
                    load();
                  }}
                >
                  Принять
                </button>
                <button
                  className="btn-ghost px-3 py-1 text-xs"
                  onClick={async () => {
                    await fetch("/api/friends", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ requestId: r.id, action: "decline" }),
                    });
                    load();
                  }}
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
          {incoming.length === 0 ? <p className="text-white/40">Нет входящих заявок</p> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Список</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {friends.map((f) => (
            <div key={f.id} className="glass flex items-center justify-between rounded-2xl p-3">
              <Link href={`/players/${f.id}`} className="flex items-center gap-2">
                <PlayerAvatar nick={f.nick} hue={f.avatarHue} avatarUrl={f.avatarUrl} size={36} online={f.online} />
                <span>
                  {f.nick}
                  <span className="block text-xs text-white/40">{f.online ? "Online" : "Offline"}</span>
                </span>
              </Link>
              <button
                className="text-xs text-rose-400"
                onClick={async () => {
                  await fetch(`/api/friends?id=${f.id}`, { method: "DELETE" });
                  load();
                }}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
