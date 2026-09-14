"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { PlayerAvatar } from "./PlayerAvatar";
import { Logo } from "./Logo";

const NAV = [
  { href: "/play", label: "Играть" },
  { href: "/matches", label: "Матчи" },
  { href: "/ranking", label: "Рейтинг" },
  { href: "/players", label: "Игроки" },
  { href: "/news", label: "Новости" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, accounts, switchAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notes, setNotes] = useState<{ id: string; title: string; body: string; href?: string; read: boolean }[]>([]);
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadNotifications = () =>
      fetch("/api/notifications", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setNotes(d.notifications ?? []);
          setUnread(d.unread ?? 0);
        })
        .catch(() => undefined);
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(timer);
  }, [user, pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-1.5 text-sm transition ${pathname === item.href ? "bg-white/10 text-accent" : "text-white/70 hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button className="relative rounded-full border border-white/10 p-2" onClick={() => setPanel((v) => !v)} aria-label="Уведомления">
                <Bell size={16} />
                {unread > 0 ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-ink-950">{unread}</span> : null}
              </button>
              <Link href="/friends" className="hidden rounded-full px-3 py-1.5 text-sm text-white/70 hover:text-white md:inline">
                Друзья
              </Link>
              <Link href="/profile" className="hidden items-center gap-2 rounded-full border border-white/10 py-1 pl-1 pr-3 md:flex">
                <PlayerAvatar nick={user.nick} hue={user.avatarHue} avatarUrl={user.avatarUrl} size={28} />
                <span className="text-sm">{user.nick}</span>
              </Link>
              {accounts.length > 1 ? (
                <div className="relative hidden md:block">
                  <select
                    className="rounded-full border border-white/10 bg-ink-900 px-2 py-1 text-xs"
                    value={user.id}
                    aria-label="Переключить аккаунт"
                    onChange={async (event) => {
                      const next = await switchAccount(event.target.value);
                      if (next) router.refresh();
                    }}
                  >
                    {accounts.map((account) => <option key={account.id} value={account.id}>{account.nick}</option>)}
                  </select>
                </div>
              ) : null}
              {user.role === "admin" ? (
                <Link href="/admin" className="hidden rounded-full px-3 py-1.5 text-xs uppercase tracking-widest text-volt md:inline">
                  Admin
                </Link>
              ) : null}
              <button
                className="hidden text-xs text-white/50 hover:text-white md:inline"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                Выход
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost px-4 py-2 text-xs">
                Вход
              </Link>
              <Link href="/register" className="btn-primary px-4 py-2 text-xs">
                Регистрация
              </Link>
            </>
          )}
          <button className="rounded-full border border-white/10 p-2 md:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-white/5 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 text-sm text-white/80">
                {item.label}
              </Link>
            ))}
            {user ? <Link href="/friends" onClick={() => setOpen(false)}>Друзья</Link> : null}
          </div>
        </div>
      ) : null}
      {panel ? (
        <div className="absolute right-4 top-16 w-80 rounded-2xl border border-white/10 bg-ink-800 p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Уведомления</p>
            <button
              className="text-xs text-accent"
              onClick={async () => {
                await fetch("/api/notifications", { method: "POST", body: JSON.stringify({}) });
                setUnread(0);
                setNotes((n) => n.map((x) => ({ ...x, read: true })));
              }}
            >
              Прочитать все
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto">
            {notes.length === 0 ? <p className="text-sm text-white/40">Пусто</p> : null}
            {notes.map((n) => (
              <Link key={n.id} href={n.href ?? "/"} className={`block rounded-xl p-2 text-sm ${n.read ? "bg-white/5" : "bg-accent/10"}`} onClick={() => setPanel(false)}>
                <p className="font-medium">{n.title}</p>
                <p className="text-white/50">{n.body}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
