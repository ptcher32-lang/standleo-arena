"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RankBadge } from "@/components/RankBadge";
import { RANKS } from "@/lib/ranks";

type Row = {
  place: number;
  id: string;
  nick: string;
  avatarHue: number;
  avatarUrl?: string;
  mmr: number;
  boardMatches: number;
  boardWins: number;
  boardWinRate: number;
};

export default function RankingPage() {
  const [board, setBoard] = useState("global");
  const [q, setQ] = useState("");
  const [rank, setRank] = useState("");
  const [sort, setSort] = useState("mmr");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ board, q, rank, sort, page: String(page) });
    fetch(`/api/ranking?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setPages(d.pages ?? 1);
      });
  }, [board, q, rank, sort, page]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Leaderboards</p>
        <h1 className="font-display text-4xl">Рейтинг</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {["global", "weekly", "monthly"].map((b) => (
          <button key={b} onClick={() => { setBoard(b); setPage(1); }} className={board === b ? "btn-primary capitalize" : "btn-ghost capitalize"}>
            {b}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input className="field" placeholder="Поиск игрока" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="field" value={rank} onChange={(e) => { setRank(e.target.value); setPage(1); }}>
          <option value="">Все звания</option>
          {RANKS.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <select className="field" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="mmr">Сортировка: MMR</option>
          <option value="wins">Победы</option>
          <option value="winrate">Win Rate</option>
          <option value="matches">Матчи</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-white/10">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-white/5 text-white/40">
            <tr>
              <th className="px-4 py-3">#</th>
              <th>Игрок</th>
              <th>Звание</th>
              <th>MMR</th>
              <th>Матчи</th>
              <th>Победы</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white/40">{r.place}</td>
                <td>
                  <Link href={`/players/${r.id}`} className="flex items-center gap-2">
                    <PlayerAvatar nick={r.nick} hue={r.avatarHue} avatarUrl={r.avatarUrl} size={32} />
                    {r.nick}
                  </Link>
                </td>
                <td>
                  <RankBadge mmr={r.mmr} size="sm" />
                </td>
                <td className="text-accent">{r.mmr}</td>
                <td>{r.boardMatches}</td>
                <td>{r.boardWins}</td>
                <td>{r.boardWinRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-3">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Назад
        </button>
        <span className="py-2 text-sm text-white/50">
          {page} / {pages}
        </span>
        <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Далее
        </button>
      </div>
    </div>
  );
}
