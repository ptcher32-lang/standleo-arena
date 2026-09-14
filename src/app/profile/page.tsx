"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function ProfileRedirect() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(`/players/${user.id}`);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const retry = window.setInterval(async () => {
      attempts += 1;
      const nextUser = await refresh();
      if (nextUser) {
        window.clearInterval(retry);
        router.replace(`/players/${nextUser.id}`);
      } else if (attempts >= 5 && !cancelled) {
        window.clearInterval(retry);
        router.replace("/login");
      }
    }, 500);
    return () => {
      cancelled = true;
      window.clearInterval(retry);
    };
  }, [user, loading, refresh, router]);
  return <p>Открываем профиль...</p>;
}
