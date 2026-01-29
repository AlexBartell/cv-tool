"use client";

import React, { useEffect, useMemo, useState } from "react";
import { detectOS, type DeviceOS } from "@/lib/device";
import { pickOffer } from "@/lib/pickOffer";

// Tracking opcional: si tu /lib/ga.ts exporta algo distinto, lo adaptás fácil
import { track } from "@/lib/ga";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void; // reemplaza onSubmit(code)
};

const LS_KEY = "cpa_unlock_state_v1";

type Stored = {
  subid: string;
  offerId: string;
  os: DeviceOS;
  createdAt: number;
};

function getOrCreateSubid(): string {
  // crypto.randomUUID() existe en browsers modernos
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // fallback
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function UnlockModal({ open, onClose, onUnlocked }: Props) {
  const [os, setOs] = useState<DeviceOS>("unknown");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOs(detectOS());
  }, [open]);

  const offer = useMemo(() => (os === "unknown" ? null : pickOffer(os)), [os]);

  // Cargar/crear estado persistido
  const stored: Stored | null = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as Stored;
    } catch {
      return null;
    }
  }, [open]);

  // Crear y guardar subid al abrir (si no existe)
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    const existing = (() => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? (JSON.parse(raw) as Stored) : null;
      } catch {
        return null;
      }
    })();

    if (!existing && offer) {
      const fresh: Stored = {
        subid: getOrCreateSubid(),
        offerId: offer.id,
        os,
        createdAt: Date.now(),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(fresh));
    }
  }, [open, offer, os]);

  useEffect(() => {
    if (open && offer) track?.("offer_impression", { os, offerId: offer.id });
  }, [open, offer, os]);

  if (!open) return null;

  const current = stored ?? (offer
    ? { subid: getOrCreateSubid(), offerId: offer.id, os, createdAt: Date.now() }
    : null);

  const offerUrl = (() => {
    if (!offer || !current) return null;
    // IMPORTANTE: CPAGrip suele aceptar subid/sub_id/clickid según setup.
    // Elegí 1 y mantenelo igual en el postback.
    const u = new URL(offer.url);
    u.searchParams.set("subid", current.subid);
    u.searchParams.set("oid", offer.id);
    u.searchParams.set("os", os);
    return u.toString();
  })();

  async function verify() {
    if (!current?.subid) return;
    setChecking(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/cpa/status?subid=${encodeURIComponent(current.subid)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setMsg("No pude verificar ahora. Intenta de nuevo en 30 segundos.");
        return;
      }

      if (data.unlocked) {
        track?.("offer_verified", { os, offerId: current.offerId });
        onUnlocked();
        onClose();
      } else {
        setMsg("Aún no aparece como completada. Si recién terminaste, espera 1–2 minutos y vuelve a verificar.");
      }
    } catch {
      setMsg("Error de conexión verificando. Reintenta.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[92vw] max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Desbloquear</h3>
            <p className="mt-1 text-sm text-gray-600">
              Completa una oferta gratuita (sin tarjeta). Luego toca “Verificar”.
            </p>
          </div>
          <button
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 rounded-xl border p-3">
          <p className="text-sm">
            Dispositivo detectado: <span className="font-medium">{os}</span>
          </p>

          {offer && offerUrl ? (
            <a
              href={offerUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => track?.("offer_click", { os, offerId: offer.id })}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Completar oferta gratuita
            </a>
          ) : (
            <p className="mt-2 text-sm text-red-600">
              No encontré una oferta compatible para este dispositivo.
            </p>
          )}

          <button
            className="mt-3 w-full rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            onClick={verify}
            disabled={checking || !current?.subid}
            type="button"
          >
            {checking ? "Verificando..." : "Ya la completé / Verificar"}
          </button>

          {msg ? <p className="mt-2 text-sm text-gray-700">{msg}</p> : null}
        </div>

        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          Esta herramienta se mantiene con una <span className="font-medium">oferta gratuita</span> para
          cubrir costos de operación de la IA y verificar que no eres un robot. No pedimos tarjeta.
        </p>

        <p className="mt-2 text-[11px] text-gray-400">
          Tip: si estás en iPhone, probá Safari. En Android, Chrome.
        </p>
      </div>
    </div>
  );
}
