"use client";

import { useEffect, useState } from "react";

const KEY = "cvtool_unlocked_v1";

export function useUnlock() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(localStorage.getItem(KEY) === "true");
  }, []);

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

  return { unlocked, verifyAndUnlock, lock };
}
