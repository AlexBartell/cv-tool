"use client";

import { useEffect, useMemo, useState } from "react";

const KEY = "cvtool_unlocked_v1";
const TRACKING_KEY = "cpa_tracking_id_v1";

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

  const trackingId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getOrCreateTrackingId();
  }, []);

  useEffect(() => {
    setUnlocked(localStorage.getItem(KEY) === "true");
  }, []);

  // ✅ NUEVO: para actualizar React al instante (sin refresh)
  function setUnlockedTrue() {
    localStorage.setItem(KEY, "true");
    setUnlocked(true);
  }

  async function verifyCpaAndUnlock() {
    const tid = trackingId ?? getOrCreateTrackingId();

    const res = await fetch(`/api/cpa/status?tracking_id=${encodeURIComponent(tid)}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!json?.unlocked) return { ok: false as const, error: "not_unlocked_yet" };

    setUnlockedTrue();
    return { ok: true as const };
  }

  async function verifyAndUnlock(code: string) {
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const json = await res.json().catch(() => ({}));
    if (!json?.ok) return { ok: false as const, error: json?.error || "invalid_code" };

    setUnlockedTrue();
    return { ok: true as const };
  }

  function lock() {
    localStorage.removeItem(KEY);
    setUnlocked(false);
  }

  return {
    unlocked,
    trackingId,
    setUnlockedTrue,     // ✅ agregado
    verifyCpaAndUnlock,
    verifyAndUnlock,
    lock,
  };
}
