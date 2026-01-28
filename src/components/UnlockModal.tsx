"use client";

import React, { useState } from "react";

export default function UnlockModal({
  open,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const [code, setCode] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[92vw] max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Desbloquear</h3>
            <p className="mt-1 text-sm text-gray-600">
              Ingresa el código que recibiste al completar la oferta gratuita.
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

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">Código</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej: ABC123"
          />
          {error ? (
            <p className="text-sm text-red-600">
              Código inválido. Verifica e intenta de nuevo.
            </p>
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

        <p className="mt-3 text-xs text-gray-500 leading-relaxed">
          Esta herramienta se mantiene con una <span className="font-medium">oferta gratuita</span> para
          cubrir costos de operación de la IA y verificar que no eres un robot. No pedimos tarjeta.
        </p>
      </div>
    </div>
  );
}
