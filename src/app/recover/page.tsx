"use client";

import { useState } from "react";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function requestToken(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setIssued(data.mockToken ?? null);
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <h1 className="font-display text-3xl">Восстановление</h1>
      <form onSubmit={requestToken} className="space-y-3">
        <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn-primary w-full">Выслать токен</button>
      </form>
      {issued ? (
        <p className="break-all rounded-xl bg-white/5 p-3 text-xs text-white/70">
          Mock-режим: токен {issued}. Подключите почтовый сервис позже.
        </p>
      ) : null}
      <form onSubmit={reset} className="space-y-3">
        <input className="field" placeholder="Токен" value={token} onChange={(e) => setToken(e.target.value)} />
        <input className="field" type="password" placeholder="Новый пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button className="btn-ghost w-full">Сменить пароль</button>
      </form>
      {done ? (
        <p className="text-accent">
          Пароль обновлён. <a href="/login">Войти</a>
        </p>
      ) : null}
    </div>
  );
}
