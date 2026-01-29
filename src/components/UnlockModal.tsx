"use client";

import React, { useEffect, useMemo, useState } from "react";
import { detectOS, type DeviceOS } from "@/lib/device";
import { pickOffer } from "@/lib/pickOffer";

export default function UnlockModal({
  open,
  onClose,
  onUnlocked,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  loading?: boolean;
}) {
  const [os, setOs] = useState<DeviceOS>("unknown");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const LS_KEY = "cpa_tracking_id_v1";

  useEffect(() => {
    if (!open) return;
    setOs(detectOS());
    setMsg(null);
  }, [open]);

  const offer = useMemo(() => (os === "unknown" ? null : pickOffer(os)), [os]);

  const trackingId = useMemo(() => {
    if (typeof window === "undefined") return null;

    const existing = localStorage.getItem(LS_KEY);
    if (existing) return existing;

    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(LS_KEY, fresh);
    return fresh;
  }, [open]);

  const offerUrl = useMemo(() => {
    if (!offer || !trackingId) return null;
    const u = new URL(offer.url);
    u.searchParams.set("tracking_id", trackingId);
    // opcional debug
    u.searchParams.set("oid", offer.id);
    u.searchParams.set("os", os);
    return u.toString();
  }, [offer, trackingId, os]);

  async function verify() {
    if (!trackingId) return;
    setChecking(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/cpa/status?tracking_id=${encodeURIComponent(trackingId)}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setMsg("No pude verificar ahora. Reintenta en unos segundos.");
        return;
      }

      if (data.unlocked) {
        // guardá un flag para no pedirlo de nuevo si querés
        localStorage.setItem("cpa_unlocked_v1", "1");
        onUnlocked();
        onClose();
      } else {
        setMsg("Aún no figura completada. Si recién terminaste, espera 1–2 minutos y vuelve a verificar.");
      }
    } catch {
      setMsg("Error de conexión verificando. Reintenta.");
    } finally {
      setChecking(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[92vw] max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Desbloquear</h3>
            <p className="mt-1 text-sm text-gray-600">
              Completa una oferta gratuita (sin tarjeta) y luego toca “Verificar”.
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

          {offerUrl ? (
            <a
              href={offerUrl}
              target="_blank"
              rel="noreferrer"
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
            disabled={checking || loading || !trackingId}
            type="button"
          >
            {checking ? "Verificando..." : "Ya la completé / Verificar"}
          </button>

          {msg ? <p className="mt-2 text-sm text-gray-700">{msg}</p> : null}
        </div>

        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          Esta herramienta se mantiene con una <span className="font-medium">oferta gratuita</span> para cubrir costos.
        </p>
      </div>
    </div>
  );
}
