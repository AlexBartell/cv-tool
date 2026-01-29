"use client";

import { useEffect, useMemo, useState } from "react";

const KEY = "cvtool_unlocked_v1";
const TRACKING_KEY = "cpa_tracking_id_v1"; // el mismo que usa UnlockModal

function getOrCreateTrackingId(): string {
  if (typeof window === "undefined") return "server";
  const existing = localStorage.getItem(TRACKING_KEY);
  if (existing) return existing;

  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(TRACKING_KEY, fresh);
  return fresh;
}

export function useUnlock() {
  const [unlocked, setUnlocked] = useState(false);

  // tracking_id estable para la sesión del usuario
  const trackingId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getOrCreateTrackingId();
  }, []);

  useEffect(() => {
    setUnlocked(localStorage.getItem(KEY) === "true");
  }, []);

  // ✅ NUEVO: verifica por CPA (server-side) y desbloquea
  async function verifyCpaAndUnlock() {
    const tid = trackingId ?? getOrCreateTrackingId();

    const res = await fetch(`/api/cpa/status?tracking_id=${encodeURIComponent(tid)}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!json?.unlocked) return { ok: false as const, error: "not_unlocked_yet" };

    localStorage.setItem(KEY, "true");
    setUnlocked(true);
    return { ok: true as const };
  }

  // ✅ LEGACY: sigue existiendo para no romper nada (pero idealmente lo dejás de usar)
  async function verifyAndUnlock(code: string) {
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const json = await res.json().catch(() => ({}));
    if (!json?.ok) return { ok: false as const, error: json?.error || "invalid_code" };

    localStorage.setItem(KEY, "true");
    setUnlocked(true);
    return { ok: true as const };
  }

  function lock() {
    localStorage.removeItem(KEY);
    setUnlocked(false);
  }

  return {
    unlocked,
    trackingId,          // por si querés mostrarlo/debug
    verifyCpaAndUnlock,  // ✅ usar esto en el flow nuevo
    verifyAndUnlock,     // legacy
    lock,
  };
}
