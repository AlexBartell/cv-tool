"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  delayMs?: number; // ej: 12000
  storageKey?: string; // ej: "atscv_intent_popup_dismissed_until"
  dismissDays?: number; // ej: 10
};

function nowMs() {
  return Date.now();
}

function addDaysMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

export default function IntentPopup({
  delayMs = 12000,
  storageKey = "atscv_intent_popup_dismissed_until",
  dismissDays = 10,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissedUntil = Number(localStorage.getItem(storageKey) || "0");
      if (dismissedUntil && dismissedUntil > nowMs()) return;

      const t = window.setTimeout(() => setOpen(true), delayMs);
      return () => window.clearTimeout(t);
    } catch {
      // Si localStorage falla, no hacemos nada agresivo
    }
  }, [delayMs, storageKey]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey, String(nowMs() + addDaysMs(dismissDays)));
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <button
        aria-label="Cerrar"
        onClick={dismiss}
        className="absolute inset-0 bg-black/40"
      />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-neutral-500">atscv.pro</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">
              ¿Qué necesitás hoy?
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Elegí una opción y empezá en menos de 1 minuto.
            </p>
          </div>

          <button
            onClick={dismiss}
            className="rounded-lg px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
            aria-label="Cerrar popup"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <Link
            href="/create"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Crear CV desde cero
          </Link>
          <Link
            href="/tool"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium hover:bg-neutral-50"
          >
            Mejorar un CV existente
          </Link>
          <button
            onClick={dismiss}
            className="mt-1 text-xs text-neutral-500 hover:text-neutral-700"
          >
            Seguir viendo ofertas
          </button>
        </div>

        <p className="mt-4 text-[11px] text-neutral-400">
          Tip: Si mandaste CVs y no te responden, suele ser formato/keywords. Si
          no tenés CV, lo mejor es crearlo desde cero.
        </p>
      </div>
    </div>
  );
}
