"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { RankBadge, RankProgressBar } from "@/components/RankBadge";
import { MmrChart } from "@/components/MmrChart";
import { ACHIEVEMENT_LABELS } from "@/lib/mmr";
import { useAuth } from "@/components/AuthProvider";
import { getRankByMmr } from "@/lib/ranks";

function isVideoFrame(url?: string) {
  return Boolean(url && (url.startsWith("data:video/") || /\.(mp4|webm|mov|ogv)(?:$|[?#])/i.test(url)));
}

type Player = {
  id: string;
  publicId: string;
  nick: string;
  bio?: string;
  playstyle?: string;
  contact?: string;
  avatarHue: number;
  avatarUrl?: string;
  rankFrameUrl?: string;
  avatarFrameUrl?: string;
  stickers?: string[];
  profileBadges?: string[];
  verified?: boolean;
  role: "user" | "admin";
  createdAt: string;
  mmr: number;
  peakMmr: number;
  wins: number;
  losses: number;
  winRate: number;
  kd: number;
  matchesPlayed: number;
  currentStreak: number;
  winStreak: number;
  mmrHistory: { at: string; mmr: number }[];
  achievements: string[];
  online: boolean;
};

type Match = {
  id: string;
  mode: string;
  createdAt: string;
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | null;
  teamA: { userId: string; mmrBefore: number; mmrDelta: number; mmrAfter: number }[];
  teamB: { userId: string; mmrBefore: number; mmrDelta: number; mmrAfter: number }[];
};

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [friends, setFriends] = useState<{ id: string; nick: string; avatarHue: number; avatarUrl?: string; online: boolean }[]>([]);
  const [msg, setMsg] = useState("");
  const [friendLoading, setFriendLoading] = useState(false);
  const [relationship, setRelationship] = useState<"self" | "friend" | "pending" | "none">("none");
  const [uploading, setUploading] = useState("");
  const [bio, setBio] = useState("");
  const [playstyle, setPlaystyle] = useState("");
  const [contact, setContact] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportEvidence, setReportEvidence] = useState("");
  const [reportEvidenceName, setReportEvidenceName] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [verificationOpen, setVerificationOpen] = useState(false);
  const updatePlayer = (next: Partial<Player>) => {
    setPlayer((current) => {
      if (!current) return current;
      return {
        ...current,
        ...next,
        achievements: next.achievements ?? current.achievements ?? [],
        mmrHistory: next.mmrHistory ?? current.mmrHistory ?? [],
        profileBadges: next.profileBadges ?? current.profileBadges ?? [],
        stickers: next.stickers ?? current.stickers ?? [],
      };
    });
  };

  useEffect(() => {
    fetch(`/api/players/${params.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const nextPlayer: Player = {
          ...d.player,
          achievements: d.player.achievements ?? [],
          mmrHistory: d.player.mmrHistory ?? [],
          profileBadges: d.player.profileBadges ?? [],
          stickers: d.player.stickers ?? [],
        };
        setPlayer(nextPlayer);
        setBio(nextPlayer.bio ?? "");
        setPlaystyle(nextPlayer.playstyle ?? "");
        setContact(nextPlayer.contact ?? "");
        setMatches(d.matches ?? []);
        setFriends(d.friends ?? []);
        setRelationship(d.relationship ?? "none");
      });
  }, [params.id]);

  if (!player) return <p>Загрузка...</p>;
  const rank = getRankByMmr(player.mmr);

  return (
    <div className="space-y-8">
      <section
        className={`profile-rank-frame rank-${rank.tier} glass grid gap-6 rounded-[28px] p-6 md:grid-cols-[auto_1fr]`}
        style={{
          borderColor: rank.color,
          boxShadow: `0 0 0 1px ${rank.glow}, 0 0 35px ${rank.glow}`,
          background: `linear-gradient(135deg, ${rank.glow}, rgba(16, 20, 29, 0.78) 42%)`,
        }}
      >
        {isVideoFrame(player.rankFrameUrl) ? (
          <video className="rank-banner-video" src={player.rankFrameUrl} autoPlay loop muted playsInline preload="none" aria-hidden />
        ) : player.rankFrameUrl ? (
          <img className="rank-banner-video" src={player.rankFrameUrl} alt="" decoding="async" />
        ) : null}
        <div>
          <div
            className="profile-avatar-aura"
            style={{ "--rank-color": rank.color, "--rank-glow": rank.glow } as CSSProperties}
          >
            <div
              className="profile-avatar-frame"
              style={{
                "--avatar-frame": player.avatarFrameUrl ? `url("${player.avatarFrameUrl}")` : "none",
              } as CSSProperties}
            >
              <PlayerAvatar nick={player.nick} hue={player.avatarHue} avatarUrl={player.avatarUrl} size={88} online={player.online} />
            </div>
          </div>
          {user?.id === player.id ? (
            <>
              <label className="avatar-upload-button btn-ghost mt-3 block cursor-pointer text-center text-xs">
                <span>Загрузить фото аватара</span>
                <input
                  className="hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploading("Фото загружается...");
                    const form = new FormData();
                    form.append("avatar", file);
                    const response = await fetch("/api/profile", { method: "PATCH", body: form, credentials: "same-origin" });
                    const data = await response.json().catch(() => ({}));
                    setUploading(response.ok ? "Фото аватара сохранено" : data.error ?? "Не удалось загрузить фото");
                    if (response.ok) updatePlayer(data.user);
                  }}
                />
              </label>
              {player.avatarFrameUrl ? (
                <button
                  type="button"
                  className="btn-ghost mt-2 block w-full text-center text-xs text-rose-200"
                  onClick={async () => {
                    setUploading("Рамка аватара удаляется...");
                    const response = await fetch("/api/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({ removeAvatarFrame: true }),
                    });
                    const data = await response.json().catch(() => ({}));
                    setUploading(response.ok ? "Рамка аватара удалена" : data.error ?? "Не удалось удалить рамку");
                    if (response.ok) updatePlayer(data.user);
                  }}
                >
                  Удалить рамку аватара
                </button>
              ) : null}
              <label className="avatar-upload-button btn-ghost mt-2 block cursor-pointer text-center text-xs">
                <span>Добавить рамку аватара</span>
                <span className="mt-1 block text-[10px] text-purple-200/70">PNG, WebP или GIF до 2 MB</span>
                <input
                  className="hidden"
                  type="file"
                  accept="image/png,image/webp,image/gif"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploading("Рамка аватара загружается...");
                    const form = new FormData();
                    form.append("avatarFrame", file);
                    const response = await fetch("/api/profile", { method: "PATCH", body: form, credentials: "same-origin" });
                    const data = await response.json();
                    setUploading(response.ok ? "Рамка аватара сохранена" : data.error ?? "Не удалось загрузить рамку");
                    if (response.ok) updatePlayer(data.user);
                  }}
                />
              </label>
              <label className="avatar-upload-button btn-ghost mt-2 block cursor-pointer text-center text-xs">
                <span>Загрузить анимацию рамки</span>
                <span className="mt-1 block text-[10px] text-purple-200/70">GIF, WebP, MP4, MOV или WebM до 4 MB</span>
                <input
                  className="hidden"
                  type="file"
                  accept="image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploading("Анимация рамки загружается...");
                    const form = new FormData();
                    form.append("rankFrame", file);
                    const response = await fetch("/api/profile", { method: "PATCH", body: form, credentials: "same-origin" });
                    const data = await response.json();
                    setUploading(response.ok ? "Анимация рамки сохранена" : data.error ?? "Не удалось загрузить рамку");
                    if (response.ok) updatePlayer(data.user);
                  }}
                />
              </label>
              {player.rankFrameUrl ? (
                <button
                  type="button"
                  className="btn-ghost mt-2 block w-full text-center text-xs text-rose-200"
                  onClick={async () => {
                    setUploading("Живые обои удаляются...");
                    const response = await fetch("/api/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({ removeRankFrame: true }),
                    });
                    const data = await response.json().catch(() => ({}));
                    setUploading(response.ok ? "Живые обои удалены" : data.error ?? "Не удалось удалить обои");
                    if (response.ok) updatePlayer(data.user);
                  }}
                >
                  Удалить живые обои
                </button>
              ) : null}
              {uploading ? <p className="mt-2 max-w-56 text-xs text-purple-200/80">{uploading}</p> : null}
            </>
          ) : null}
        </div>
        <div>
          {(player.profileBadges ?? []).length > 0 ? (
            <div className="profile-badges" aria-label="Значки профиля">
              {(player.profileBadges ?? []).map((badge, index) => (
                <span key={`${badge}-${index}`} className="profile-badge">{badge}</span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-4xl">
              {player.nick}
              {player.verified ? (
                <button
                  type="button"
                  className="verified-badge verified-badge-button"
                  title="Проверенный аккаунт"
                  aria-label="Открыть информацию о подтверждённом аккаунте"
                  aria-expanded={verificationOpen}
                  onClick={() => setVerificationOpen((open) => !open)}
                >
                  ✓
                </button>
              ) : null}
              {player.role === "admin" ? <span className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">ADMIN</span> : null}
            </h1>
            {player.verified && verificationOpen ? (
              <div className="verification-popover" role="status">
                <div className="flex items-center gap-2">
                  <span className="verified-badge" aria-hidden="true">✓</span>
                  <strong>Подтверждённый аккаунт</strong>
                </div>
                <p>Этот профиль подтверждён администрацией STANDLEO.</p>
                <span className="verification-role">Разработчик сайта</span>
              </div>
            ) : null}
            <RankBadge mmr={player.mmr} />
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: rank.color }}>
            Рамка звания · {rank.name}
          </p>
          {player.verified ? (
            <div className="verified-status mt-3">
              <span className="verified-badge" aria-hidden="true">✓</span>
              <span>Проверенный игрок</span>
            </div>
          ) : null}
          <p className="mt-1 text-sm text-white/40">
            {player.publicId} · с {new Date(player.createdAt).toLocaleDateString("ru")}
          </p>
          <div className="mt-4">
            <RankProgressBar mmr={player.mmr} />
          </div>
          {user && user.id !== player.id && relationship === "none" ? (
            <button
              className="btn-primary mt-4 min-h-11 w-full sm:w-auto"
              disabled={friendLoading}
              onClick={async () => {
                setFriendLoading(true);
                try {
                  const res = await fetch("/api/friends", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ toId: player.id }),
                  });
                  const data = await res.json();
                  setMsg(res.ok ? "Заявка отправлена" : data.error ?? "Не удалось отправить заявку");
                  if (res.ok) setRelationship("pending");
                } finally {
                  setFriendLoading(false);
                }
              }}
            >
              {friendLoading ? "Отправляем..." : "Добавить в друзья"}
            </button>
          ) : null}
          {user && user.id !== player.id ? (
            <div className="mt-4">
              {!reportOpen ? (
                <button className="btn-ghost text-xs text-rose-300" onClick={() => setReportOpen(true)}>
                  Пожаловаться на игрока
                </button>
              ) : (
                <div className="max-w-md space-y-2 rounded-2xl border border-rose-300/20 bg-rose-400/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-rose-200/80">Античит-репорт</p>
                  <textarea
                    className="field min-h-20"
                    maxLength={400}
                    placeholder="Опиши подозрение и укажи момент..."
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                  />
                  <label className="btn-ghost inline-block cursor-pointer text-xs">
                    Скриншот с ПК или телефона
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          setReportMessage("Файл должен быть до 2 MB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setReportEvidence(String(reader.result));
                          setReportEvidenceName(file.name);
                          setReportMessage("");
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {reportEvidence ? (
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                      <img className="h-14 w-14 rounded-lg object-cover" src={reportEvidence} alt="Предпросмотр скриншота" />
                      <span className="min-w-0 truncate text-xs text-white/60">{reportEvidenceName || "Скриншот выбран"}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-white/45">На телефоне можно выбрать фото из галереи или сделать снимок камерой.</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      className="btn-primary text-xs"
                      disabled={reportReason.trim().length < 8}
                      onClick={async () => {
                        const response = await fetch("/api/reports", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "same-origin",
                          body: JSON.stringify({ targetId: player.id, reason: reportReason, evidenceUrl: reportEvidence || undefined }),
                        });
                        const data = await response.json();
                        setReportMessage(response.ok ? "Репорт отправлен на проверку" : data.error ?? "Не удалось отправить репорт");
                        if (response.ok) setReportOpen(false);
                      }}
                    >
                      Отправить
                    </button>
                    <button className="btn-ghost text-xs" onClick={() => setReportOpen(false)}>Отмена</button>
                  </div>
                  {reportMessage ? <p className="text-xs text-white/60">{reportMessage}</p> : null}
                </div>
              )}
            </div>
          ) : null}
          {relationship === "pending" ? <p className="mt-4 text-sm text-amber-200">Заявка отправлена</p> : null}
          {relationship === "friend" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-accent">Ваш друг</span>
              <button
                className="btn-ghost text-xs text-rose-300"
                onClick={async () => {
                  const response = await fetch(`/api/friends?id=${player.id}`, { method: "DELETE" });
                  if (response.ok) {
                    setRelationship("none");
                    setMsg("Друг удалён");
                  }
                }}
              >
                Удалить из друзей
              </button>
            </div>
          ) : null}
          {msg ? <p className="mt-2 text-sm text-accent">{msg}</p> : null}
        </div>
      </section>

      {user && user.id !== player.id ? (
        <section className="glass rounded-3xl border border-rose-300/15 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-200/70">Помощь</p>
          <h2 className="mt-1 font-display text-2xl">Как отправить скриншот</h2>
          <p className="mt-3 text-sm leading-7 text-white/65">
            Нажми «Пожаловаться на игрока», затем выбери «Скриншот с ПК или телефона».
            На компьютере можно выбрать файл с диска, а на телефоне — изображение из галереи или сделать снимок камерой.
            Размер доказательства — до 2 MB.
          </p>
        </section>
      ) : null}

      <section className="profile-about glass rounded-3xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-200/70">Профиль игрока</p>
            <h2 className="mt-1 font-display text-2xl">О себе</h2>
          </div>
          {player.playstyle ? (
            <span className="rounded-full border border-purple-300/30 bg-purple-400/10 px-3 py-1 text-xs text-purple-100">
              {player.playstyle}
            </span>
          ) : null}
        </div>
        {user?.id === player.id ? (
          <div className="mt-4 space-y-3">
            <textarea
              className="field min-h-24 resize-y"
              maxLength={280}
              placeholder="Расскажи о себе, своём стиле игры или целях..."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="field max-w-xs"
                maxLength={40}
                placeholder="Стиль игры, например Entry fragger"
                value={playstyle}
                onChange={(event) => setPlaystyle(event.target.value)}
              />
              <input
                className="field max-w-xs"
                maxLength={120}
                placeholder="Discord или Telegram"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              />
              <button
                className="btn-primary"
                disabled={savingAbout}
                onClick={async () => {
                  setSavingAbout(true);
                  setMsg("");
                  try {
                    const response = await fetch("/api/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "same-origin",
                      body: JSON.stringify({ bio, playstyle, contact }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      setMsg(data.error ?? "Не удалось сохранить профиль");
                      return;
                    }
                    updatePlayer(data.user);
                    setMsg("Профиль сохранён");
                  } catch {
                    setMsg("Нет соединения с сервером");
                  } finally {
                    setSavingAbout(false);
                  }
                }}
              >
                {savingAbout ? "Сохраняем..." : "Сохранить профиль"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-7 text-white/65">
              {player.bio || "Игрок пока ничего о себе не написал."}
            </p>
            {player.contact ? (
              <p className="text-sm text-accent">Связь: {player.contact}</p>
            ) : null}
          </div>
        )}
      </section>

      <section className="profile-stickers glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-200/70">Коллекция</p>
            <h2 className="mt-1 font-display text-2xl">Стикеры</h2>
          </div>
          {user?.id === player.id ? (
            <label className="btn-ghost cursor-pointer text-xs">
              Добавить стикер
              <input
                className="hidden"
                type="file"
                accept="image/png,image/webp,image/gif"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append("sticker", file);
                  const response = await fetch("/api/profile", { method: "PATCH", body: form });
                  if (response.ok) updatePlayer((await response.json()).user);
                }}
              />
            </label>
          ) : null}
        </div>
        <div className="sticker-list mt-4">
          {(player.stickers ?? []).map((sticker, index) => (
            <div key={`${sticker.slice(0, 24)}-${index}`} className="sticker-card">
              <img src={sticker} alt={`Стикер ${index + 1}`} />
              <div className="sticker-meta">
                <span className="sticker-number">0{index + 1}</span>
                <span>Standoff sticker</span>
              </div>
            </div>
          ))}
          {(player.stickers ?? []).length === 0 ? <p className="text-sm text-white/40">Пока нет стикеров</p> : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Победы", player.wins],
          ["Поражения", player.losses],
          ["Win Rate", `${player.winRate}%`],
          ["K/D", player.kd],
          ["Матчи", player.matchesPlayed],
          ["Серия", player.currentStreak],
          ["Лучший MMR", player.peakMmr],
          ["Win streak", player.winStreak],
        ].map(([k, v]) => (
          <div key={String(k)} className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-widest text-white/40">{k}</p>
            <p className="mt-1 text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="mb-3 font-medium">График MMR</h2>
        <MmrChart history={player.mmrHistory} />
      </section>

      <section>
        <h2 className="mb-3 font-medium">Достижения</h2>
        <div className="flex flex-wrap gap-2">
          {(player.achievements ?? []).map((a) => (
            <span key={a} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm">
              {ACHIEVEMENT_LABELS[a]?.title ?? a}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Друзья</h2>
        <div className="flex flex-wrap gap-3">
          {friends.map((f) => (
            <Link key={f.id} href={`/players/${f.id}`} className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
              <PlayerAvatar nick={f.nick} hue={f.avatarHue} avatarUrl={f.avatarUrl} size={28} online={f.online} />
              {f.nick}
            </Link>
          ))}
          {friends.length === 0 ? <p className="text-white/40">Пока пусто</p> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">История матчей</h2>
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-white/5 text-white/40">
              <tr>
                <th className="px-4 py-3">Дата</th>
                <th>Режим</th>
                <th>Счёт</th>
                <th>Результат</th>
                <th>Старый MMR</th>
                <th>Изменение</th>
                <th>Новый MMR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const slot = [...m.teamA, ...m.teamB].find((s) => s.userId === player.id);
                const inA = m.teamA.some((s) => s.userId === player.id);
                const win = (inA && m.winner === "A") || (!inA && m.winner === "B");
                return (
                  <tr key={m.id} className="border-t border-white/5">
                    <td className="px-4 py-3">{new Date(m.createdAt).toLocaleString("ru")}</td>
                    <td>{m.mode}</td>
                    <td>
                      {m.scoreA}:{m.scoreB}
                    </td>
                    <td className={win ? "text-accent" : "text-rose-400"}>{win ? "Победа" : "Поражение"}</td>
                    <td>{slot?.mmrBefore}</td>
                    <td>
                      {slot && slot.mmrDelta >= 0 ? "+" : ""}
                      {slot?.mmrDelta}
                    </td>
                    <td>{slot?.mmrAfter}</td>
                    <td>
                      <Link className="text-accent" href={`/matches/${m.id}`}>
                        Статистика
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
