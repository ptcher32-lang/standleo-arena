"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Не удалось войти (${res.status})`);
        return;
      }
      const signedInUser = await refresh();
      if (!signedInUser) {
        setError("Вход выполнен, но сессия не сохранилась. Обнови страницу и попробуй ещё раз.");
        return;
      }
      window.location.href = `/players/${signedInUser.id}`;
    } catch {
      setError("Не удалось подключиться к серверу. Проверь соединение и попробуй ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl">Вход</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Проверяем данные..." : "Войти"}
        </button>
      </form>
      <p className="mt-4 text-sm text-white/50">
        Нет аккаунта? <a href="/register" className="text-accent">Регистрация</a> · <a href="/recover" className="text-accent">Восстановление</a>
      </p>
    </div>
  );
}
