"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type AuthUser = {
  id: string;
  publicId: string;
  email?: string;
  nick: string;
  avatarHue: number;
  avatarUrl?: string;
  role: "user" | "admin";
  mmr: number;
  rank: string;
  online: boolean;
};

export type SwitchAccount = Pick<AuthUser, "id" | "nick" | "avatarHue" | "avatarUrl" | "role">;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  accounts: SwitchAccount[];
  switchAccount: (userId: string) => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<SwitchAccount[]>([]);
  const userRef = useRef<AuthUser | null>(null);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 401) {
        return userRef.current;
      }
      const nextUser = res.ok ? data.user ?? null : null;
      userRef.current = nextUser;
      setUser(nextUser);
      if (nextUser) {
        const accountResponse = await fetch("/api/auth/accounts", { cache: "no-store", credentials: "same-origin" });
        const accountData = await accountResponse.json().catch(() => ({}));
        setAccounts(accountResponse.ok ? accountData.accounts ?? [] : []);
      } else {
        setAccounts([]);
      }
      return nextUser;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const heartbeat = () => {
      fetch("/api/auth/presence", { method: "POST", keepalive: true }).catch(() => undefined);
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 20_000);
    return () => window.clearInterval(timer);
  }, [user]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    userRef.current = null;
    setUser(null);
    setAccounts([]);
  }, []);

  const switchAccount = useCallback(async (userId: string) => {
    const response = await fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) return null;
    return refresh();
  }, [refresh]);

  const value = useMemo(() => ({ user, loading, refresh, logout, accounts, switchAccount }), [user, loading, refresh, logout, accounts, switchAccount]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
