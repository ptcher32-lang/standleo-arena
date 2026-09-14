"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function RegisterPage() {
  const { refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nick, setNick] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"email" | "details">("email");

  function continueWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Введите корректный email");
      return;
    }
    setStep("details");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim(), password, nick: nick.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Не удалось создать аккаунт (${res.status})`);
        return;
      }
      await refresh();
      router.replace("/profile");
    } catch {
      setError("Не удалось подключиться к серверу. Проверь, что сайт запущен, и повтори попытку.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl">Регистрация</h1>
      <p className="mt-2 text-sm text-white/50">{step === "email" ? "Введите email, чтобы начать." : "Придумайте ник и пароль для аккаунта."}</p>
      {step === "email" ? (
        <form onSubmit={continueWithEmail} className="mt-6 space-y-3">
          <input className="field" placeholder="Email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <button className="btn-primary w-full">Продолжить</button>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input className="field" placeholder="Ник" autoFocus value={nick} onChange={(e) => setNick(e.target.value)} />
          <input className="field" placeholder="Пароль (от 8 символов)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-sm text-white/40">Email: {email}</p>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <button className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Создание..." : "Создать аккаунт"}
          </button>
        </form>
      )}
    </div>
  );
}
