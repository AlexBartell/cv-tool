"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  delayMs?: number;
  storageKey?: string;
  dismissDays?: number;
};

function nowMs() {
  return Date.now();
}

function addDaysMs(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

function useRandomVariant() {
  // Variante A/B ligera para que no parezca repetitivo
  return useMemo(() => {
    const variants = [
      {
        badge: "Aumentá tus chances",
        title: "Que tu CV sí llegue a un reclutador",
        subtitle:
          "La mayoría de CV se cae por formato o palabras clave. En 2 minutos lo dejás listo para postular.",
      },
      {
        badge: "Listo para postular",
        title: "Más entrevistas, menos silencio",
        subtitle:
          "Optimiza estructura + keywords para pasar filtros (ATS) y que tu perfil se lea claro.",
      },
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }, []);
}

export default function IntentPopup({
  delayMs = 12000,
  storageKey = "atscv_intent_popup_dismissed_until",
  dismissDays = 10,
}: Props) {
  const [open, setOpen] = useState(false);
  const variant = useRandomVariant();

  useEffect(() => {
    try {
      const dismissedUntil = Number(localStorage.getItem(storageKey) || "0");
      if (dismissedUntil && dismissedUntil > nowMs()) return;

      const t = window.setTimeout(() => setOpen(true), delayMs);
      return () => window.clearTimeout(t);
    } catch {
      // si falla localStorage, mejor no ser agresivos
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
      {/* Backdrop */}
      <button
        aria-label="Cerrar"
        onClick={dismiss}
        className="absolute inset-0 bg-black/50"
      />

      {/* Modal */}
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-neutral-50 via-white to-neutral-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  {variant.badge}
                </div>

                <h3 className="mt-3 text-xl font-semibold tracking-tight text-neutral-900">
                  {variant.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {variant.subtitle}
                </p>
              </div>

              <button
                onClick={dismiss}
                className="rounded-xl px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100"
                aria-label="Cerrar popup"
              >
                ✕
              </button>
            </div>

            {/* Trust row */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
                ✅ Formato simple (ATS)
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
                ✅ Palabras clave
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
                ✅ Listo para enviar
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            <p className="text-sm font-medium text-neutral-800">
              Elegí tu punto de partida:
            </p>

            <div className="mt-3 grid gap-2">
              <Link
                href="/create"
                onClick={dismiss}
                className="group inline-flex items-center justify-between rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
              >
                <span>
                  Crear CV desde cero
                  <span className="mt-0.5 block text-xs font-normal text-white/80">
                    Si no tenés CV o querés uno limpio y profesional
                  </span>
                </span>
                <span className="rounded-xl bg-white/10 px-2 py-1 text-xs group-hover:bg-white/15">
                  Empezar →
                </span>
              </Link>

              <Link
                href="/tool"
                onClick={dismiss}
                className="group inline-flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
              >
                <span>
                  Mejorar mi CV actual
                  <span className="mt-0.5 block text-xs font-normal text-neutral-600">
                    Ajustá formato + keywords para postular mejor
                  </span>
                </span>
                <span className="rounded-xl bg-neutral-100 px-2 py-1 text-xs text-neutral-700 group-hover:bg-neutral-200">
                  Mejorar →
                </span>
              </Link>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={dismiss}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Seguir viendo ofertas
              </button>

              <span className="text-[11px] text-neutral-400">
                Tip: un CV simple gana contra uno “bonito” que el ATS no lee.
              </span>
            </div>
          </div>

          {/* Small brand footer */}
          <div className="border-t border-neutral-100 px-5 py-3 text-[11px] text-neutral-400">
            atscv.pro · herramientas para crear y mejorar CV
          </div>
        </div>
      </div>
    </div>
  );
}
