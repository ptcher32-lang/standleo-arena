"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { RankBadge } from "@/components/RankBadge";

type Dash = {
  users: number;
  online: number;
  matches: number;
  live: number;
  searching: number;
  reportsOpen: number;
  server: { configured: boolean; message: string };
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [dash, setDash] = useState<Dash | null>(null);
  const [users, setUsers] = useState<{ id: string; nick: string; email: string; banned: boolean; mmr: number; online: boolean; antiCheatRisk?: number }[]>([]);
  const [matches, setMatches] = useState<
    { id: string; mode: string; status: string; scoreA: number; scoreB: number; winner: "A" | "B" | null; proofUrl?: string; detectedScoreA?: number; detectedScoreB?: number; detectedWinner?: "A" | "B"; detectedWinnerNick?: string }[]
  >([]);
  const [reports, setReports] = useState<{ id: string; reason: string; status: string; createdAt: string; riskScore?: number; evidenceUrl?: string }[]>([]);
  const [news, setNews] = useState<{ id: string; title: string }[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", excerpt: "", content: "" });
  const [matchScores, setMatchScores] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [matchProofs, setMatchProofs] = useState<Record<string, boolean>>({});
  const [matchMessages, setMatchMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/");
  }, [user, loading, router]);

  async function load(section = tab) {
    const res = await fetch(`/api/admin?section=${section}&q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (section === "dashboard") setDash(data);
    if (section === "users" || section === "players") setUsers(data.users ?? []);
    if (section === "matches") {
      const nextMatches = data.matches ?? [];
      setMatches(nextMatches);
      setMatchScores((current) => {
        const next = { ...current };
        for (const match of nextMatches) {
          if (match.detectedScoreA !== undefined && match.detectedScoreB !== undefined) {
            next[match.id] = { scoreA: String(match.detectedScoreA), scoreB: String(match.detectedScoreB) };
          }
        }
        return next;
      });
    }
    if (section === "reports") setReports(data.reports ?? []);
    if (section === "news") setNews(data.news ?? []);
  }

  useEffect(() => {
    if (user?.role === "admin") load(tab);
  }, [tab, user, q]);

  const tabs = ["dashboard", "users", "matches", "reports", "news", "players"];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-volt">Restricted</p>
        <h1 className="font-display text-4xl">Admin Panel</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? "btn-primary capitalize" : "btn-ghost capitalize"}>
            {t}
          </button>
        ))}
      </div>

      {tab === "dashboard" && dash ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Пользователи", dash.users],
            ["Онлайн", dash.online],
            ["Матчи", dash.matches],
            ["Активные матчи", dash.live],
            ["В поиске", dash.searching],
            ["Открытые жалобы", dash.reportsOpen],
          ].map(([k, v]) => (
            <div key={String(k)} className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-widest text-white/40">{k}</p>
              <p className="mt-2 text-3xl">{v}</p>
            </div>
          ))}
          <div className="glass md:col-span-3 rounded-2xl p-5 text-sm text-white/60">
            STANDLEO LITE adapter: {dash.server.configured ? "configured" : "mock"} — {dash.server.message}
          </div>
        </div>
      ) : null}

      {tab === "users" || tab === "players" ? (
        <div className="space-y-3">
          <input className="field max-w-md" placeholder="Поиск" value={q} onChange={(e) => setQ(e.target.value)} />
          {users.map((u) => (
            <div key={u.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
              <div>
                <p className="font-medium">{u.nick}</p>
                <p className="text-xs text-white/40">{u.email}</p>
                <RankBadge mmr={u.mmr} size="sm" />
                {u.antiCheatRisk && u.antiCheatRisk >= 50 ? (
                  <p className="mt-1 text-xs text-amber-300">Античит-флаг: риск {u.antiCheatRisk}/100</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <a className="btn-ghost text-xs" href={`/players/${u.id}`}>
                  Профиль
                </a>
                <button
                  className="btn-ghost text-xs"
                  onClick={async () => {
                    await fetch("/api/admin", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: u.banned ? "unban" : "ban", userId: u.id }),
                    });
                    load("users");
                  }}
                >
                  {u.banned ? "Разблокировать" : "Заблокировать"}
                </button>
                {!u.banned ? (
                  <>
                    <button
                      className="btn-ghost text-xs text-amber-300"
                      onClick={async () => {
                        await fetch("/api/admin", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "kick", userId: u.id }),
                        });
                        load("users");
                      }}
                    >
                      Кикнуть
                    </button>
                    <button
                      className="btn-ghost text-xs text-rose-300"
                      onClick={async () => {
                        if (!window.confirm("Заблокировать аккаунт и устройства этого игрока?")) return;
                        await fetch("/api/admin", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "ban_device", userId: u.id }),
                        });
                        load("users");
                      }}
                    >
                      Бан устройства
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "matches" ? (
        <div className="space-y-2">
          {matches.map((m) => (
            <div key={m.id} className="glass space-y-3 rounded-2xl p-3">
              <a href={`/matches/${m.id}`} className="flex justify-between">
                <span>{m.mode} · {m.status === "live" ? "Ожидает результата" : m.status}</span>
                <span>{m.scoreA}:{m.scoreB}</span>
              </a>
              {m.proofUrl ? (
                <div className="flex flex-wrap items-center gap-3">
                  <a className="text-xs text-accent underline" href={m.proofUrl} target="_blank" rel="noreferrer">
                    Открыть скрин результата
                  </a>
                  {m.status === "live" ? (
                    <button
                      className="btn-ghost text-xs"
                      onClick={async () => {
                        const response = await fetch("/api/admin", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "analyze_match", matchId: m.id }),
                        });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) {
                          setMatchMessages((current) => ({ ...current, [m.id]: data.error ?? "Не удалось распознать счёт." }));
                          return;
                        }
                        setMatchScores((current) => ({
                          ...current,
                          [m.id]: { scoreA: String(data.scoreA), scoreB: String(data.scoreB) },
                        }));
                        setMatchProofs((current) => ({ ...current, [m.id]: true }));
                        setMatchMessages((current) => ({
                          ...current,
                          [m.id]: `Скрин распознан: ${data.scoreA}:${data.scoreB}, победитель команды ${data.winner}${data.winnerNick ? ` · ${data.winnerNick}` : " · ник не распознан"}. Проверь и подтверди результат.`,
                        }));
                      }}
                    >
                      Распознать счёт со скрина
                    </button>
                  ) : null}
                </div>
              ) : null}
              {m.status === "live" ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  <span className="text-sm text-white/60">Результат по скриншоту:</span>
                  <label className="btn-ghost cursor-pointer text-xs">
                    Вставить скриншот
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setMatchProofs((current) => ({ ...current, [m.id]: Boolean(e.target.files?.[0]) }))
                      }
                    />
                  </label>
                  {matchProofs[m.id] ? <span className="text-xs text-accent">Скриншот принят</span> : null}
                  <input
                    className="field w-20"
                    type="number"
                    min="0"
                    placeholder="A"
                    value={matchScores[m.id]?.scoreA ?? ""}
                    onChange={(e) =>
                      setMatchScores((current) => ({
                        ...current,
                        [m.id]: { scoreA: e.target.value, scoreB: current[m.id]?.scoreB ?? "" },
                      }))
                    }
                  />
                  <span>:</span>
                  <input
                    className="field w-20"
                    type="number"
                    min="0"
                    placeholder="B"
                    value={matchScores[m.id]?.scoreB ?? ""}
                    onChange={(e) =>
                      setMatchScores((current) => ({
                        ...current,
                        [m.id]: { scoreA: current[m.id]?.scoreA ?? "", scoreB: e.target.value },
                      }))
                    }
                  />
                  {(["A", "B"] as const).map((winner) => (
                    <button
                      key={winner}
                      className="btn-primary text-xs"
                      onClick={async () => {
                        const score = matchScores[m.id];
                        if (!score || score.scoreA === "" || score.scoreB === "") {
                          setMatchMessages((current) => ({ ...current, [m.id]: "Введи счёт обеих команд." }));
                          return;
                        }
                        if (Number(score.scoreA) === Number(score.scoreB)) {
                          setMatchMessages((current) => ({ ...current, [m.id]: "Счёт команд не может быть одинаковым." }));
                          return;
                        }
                        const response = await fetch("/api/admin", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "complete_match",
                            matchId: m.id,
                            winner,
                            scoreA: Number(score.scoreA),
                            scoreB: Number(score.scoreB),
                            proofAttached: Boolean(m.proofUrl || matchProofs[m.id]),
                          }),
                        });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) {
                          setMatchMessages((current) => ({ ...current, [m.id]: data.error ?? "Не удалось подтвердить результат." }));
                          return;
                        }
                        setMatchMessages((current) => ({ ...current, [m.id]: `Команда ${winner} подтверждена. MMR начислен.` }));
                        load("matches");
                      }}
                    >
                      Победа команды {winner}
                    </button>
                  ))}
                  {m.detectedWinner ? <p className="basis-full text-xs text-accent">По скрину определено: {m.detectedScoreA}:{m.detectedScoreB}, победитель команды {m.detectedWinner}{m.detectedWinnerNick ? ` · ${m.detectedWinnerNick}` : " · ник не распознан"}</p> : null}
                  {matchMessages[m.id] ? <p className="basis-full text-xs text-accent">{matchMessages[m.id]}</p> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {tab === "reports" ? (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="glass space-y-2 rounded-2xl p-3">
              <p>{r.reason}</p>
              <p className="text-xs text-white/40">
                {r.status} · риск {r.riskScore ?? 0}/100 · {new Date(r.createdAt).toLocaleString("ru")}
              </p>
              {r.evidenceUrl ? <a className="text-xs text-accent underline" href={r.evidenceUrl} target="_blank" rel="noreferrer">Открыть доказательство</a> : null}
              <div className="flex gap-2">
                {(["reviewing", "resolved", "dismissed"] as const).map((s) => (
                  <button
                    key={s}
                    className="btn-ghost text-xs"
                    onClick={async () => {
                      await fetch("/api/admin", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "report", reportId: r.id, status: s }),
                      });
                      load("reports");
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "news" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch("/api/admin/news", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              setForm({ title: "", excerpt: "", content: "" });
              load("news");
            }}
          >
            <input className="field" placeholder="Заголовок" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="field" placeholder="Кратко" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
            <textarea className="field min-h-32" placeholder="Текст" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <button className="btn-primary">Создать</button>
          </form>
          <div className="space-y-2">
            {news.map((n) => (
              <div key={n.id} className="glass flex items-center justify-between rounded-2xl p-3">
                <span>{n.title}</span>
                <button
                  className="text-xs text-rose-400"
                  onClick={async () => {
                    await fetch(`/api/admin/news?id=${n.id}`, { method: "DELETE" });
                    load("news");
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
