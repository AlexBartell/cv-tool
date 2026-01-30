"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  delayMs?: number;          // ej: 6000
  dismissDays?: number;      // ej: 10
  storageKey?: string;       // ej: "atscv_sticky_dismissed_until"
};

function nowMs() {
  return Date.now();
}

function addDaysMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

export default function StickyCtaBar({
  delayMs = 6000,
  dismissDays = 10,
  storageKey = "atscv_sticky_dismissed_until",
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissedUntil = Number(localStorage.getItem(storageKey) || "0");
      if (dismissedUntil && dismissedUntil > nowMs()) return;

      const t = window.setTimeout(() => setOpen(true), delayMs);
      return () => window.clearTimeout(t);
    } catch {
      // si falla storage, mejor no insistir
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
    <div className="fixed inset-x-0 bottom-3 z-50 px-3">
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/85 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5 backdrop-blur">
          {/* Accent glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-40 w-40 rounded-full bg-blue-400/15 blur-3xl" />

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="min-w-0 pr-10">
              <p className="text-xs font-semibold text-neutral-900">
                Subí tus chances de ser llamado
              </p>
              <p className="mt-0.5 text-sm text-neutral-700">
                Hacelo simple: formato claro + keywords del puesto (ATS). Elegí una opción:
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-800 ring-1 ring-black/5">
                  ✅ Listo para postular
                </span>
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-800 ring-1 ring-black/5">
                  ✅ Menos “ghosting”
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              >
                Crear CV desde cero
              </Link>
              <Link
                href="/tool"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-black/10 hover:bg-neutral-50"
              >
                Mejorar mi CV
              </Link>
            </div>

            <button
              onClick={dismiss}
              aria-label="Cerrar"
              className="absolute right-3 top-3 rounded-xl px-2 py-1 text-sm text-neutral-700 hover:bg-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-2 flex justify-center">
          <button
            onClick={dismiss}
            className="text-[11px] text-neutral-500 hover:text-neutral-700"
          >
            No mostrar por {dismissDays} días
          </button>
        </div>
      </div>
    </div>
  );
}
