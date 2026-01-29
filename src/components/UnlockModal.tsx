"use client";

import React, { useEffect, useMemo, useState } from "react";
import { detectOS, type DeviceOS } from "@/lib/device";
import { pickOffer } from "@/lib/pickOffer";

type Props = {
  open: boolean;
  onClose: () => void;

  // NUEVO: unlock automático (sin código)
  onUnlocked?: () => void;

  // LEGACY: unlock por código (para no romper create/tool mientras migrás)
  onSubmit?: (code: string) => void | Promise<void>;

  loading?: boolean;
  error?: string | null;
};

export default function UnlockModal({
  open,
  onClose,
  onUnlocked,
  onSubmit,
  loading,
  error,
}: Props) {
  const [os, setOs] = useState<DeviceOS>("unknown");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Solo se usa si te pasan onSubmit (modo legacy)
  const [code, setCode] = useState("");

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
        : `${Date.now()}_${Math.random() * 1e9}`;

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
  localStorage.setItem("cvtool_unlocked_v1", "true");
  onUnlocked?.();
  onClose();
}
 else {
        setMsg("Aún no figura completada. Si recién terminaste, espera 1–2 minutos y vuelve a verificar.");
      }
    } catch {
      setMsg("Error de conexión verificando. Reintenta.");
    } finally {
      setChecking(false);
    }
  }

  if (!open) return null;

  const legacyMode = typeof onSubmit === "function";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[92vw] max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Desbloquear</h3>
            <p className="mt-1 text-sm text-gray-600">
              {legacyMode
                ? "Ingresa el código que recibiste al completar la oferta gratuita."
                : "Completa una oferta gratuita (sin tarjeta) y luego toca “Verificar”."}
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

        {/* MODO NUEVO (sin código) */}
        {!legacyMode ? (
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
        ) : (
          /* MODO LEGACY (con código) */
          <>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Código</label>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: ABC123"
              />
              {error ? (
                <p className="text-sm text-red-600">Código inválido. Verifica e intenta de nuevo.</p>
              ) : null}
            </div>

            <button
              className="mt-4 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              disabled={loading || !code.trim()}
              onClick={() => onSubmit(code)}
              type="button"
            >
              {loading ? "Verificando..." : "Desbloquear"}
            </button>
          </>
        )}

        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          Esta herramienta se mantiene con una <span className="font-medium">oferta gratuita</span> para cubrir costos.
        </p>
      </div>
    </div>
  );
}
