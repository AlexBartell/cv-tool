"use client";

import React, { useMemo, useRef, useState } from "react";
import UnlockModal from "@/components/UnlockModal";
import { useUnlock } from "@/lib/useUnlock";
import { useEffect } from "react";
import { gaEvent } from "@/lib/ga";

type Country = "MX" | "UY" | "US" | "CO" | "AR" | "CL";

const countryLabel: Record<Country, string> = {
  MX: "México",
  UY: "Uruguay",
  US: "Estados Unidos",
  CO: "Colombia",
  AR: "Argentina",
  CL: "Chile",
};

export default function ToolPage() {
  const [cvText, setCvText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [country, setCountry] = useState<Country>("MX");
const [email, setEmail] = useState("");
const [linkedin, setLinkedin] = useState("");
const [atsScore, setAtsScore] = useState<number | null>(null);
const [atsDetails, setAtsDetails] = useState<any[] | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState("");
  useEffect(() => {
    gaEvent("start_tool", { tool: "improve" });
  }, []);
  // Foto
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [includePhoto, setIncludePhoto] = useState(true);

  const canImprove = useMemo(() => {
    return !loading && !extracting && cvText.trim().length > 0 && targetRole.trim().length > 0;
  }, [loading, extracting, cvText, targetRole]);
const { unlocked, verifyAndUnlock } = useUnlock();
const pendingActionRef = useRef<null | (() => void)>(null);

const [unlockOpen, setUnlockOpen] = useState(false);
const [unlockBusy, setUnlockBusy] = useState(false);
const [unlockError, setUnlockError] = useState<string | null>(null);

function requireUnlock(action: () => void) {
  if (unlocked) return action();
  pendingActionRef.current = action;
  setUnlockError(null);
  setUnlockOpen(true);
}

async function onSubmitUnlock(code: string) {
  setUnlockBusy(true);
  setUnlockError(null);
  const res = await verifyAndUnlock(code);
   gaEvent("unlock_completed", { tool: "improve" });
  setUnlockBusy(false);

  if (!res.ok) {
    setUnlockError("invalid");
    return;
  }

  setUnlockOpen(false);

  if (pendingActionRef.current) {
    const fn = pendingActionRef.current;
    pendingActionRef.current = null;
    fn();
  }
}

async function getAtsScore(md: string) {
  const res = await fetch("/api/cv/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown: md }),
  });
  const data = await res.json();
  if (!data.ok) return;
  setAtsScore(data.score);
  setAtsDetails(data.criteria);
}

  async function extractFromFile(file: File | null) {
    if (!file) return;

    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/cv/extract", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!data.ok) {
        alert(`Error extrayendo texto: ${data.error}${data.hint ? `\n\n${data.hint}` : ""}`);
        return;
      }

      setCvText(data.text);
      // Nota: no completamos targetRole, eso lo tiene que elegir el usuario.
    } finally {
      setExtracting(false);
    }
  }

  async function improveCV() {
  setLoading(true);
  setResult("");

  const res = await fetch("/api/cv/improve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cvText,
      targetRole,
      country,
      email: email.trim() || null,
      linkedin: linkedin.trim() || null,
    }),
  });

  const data = await res.json();
  setLoading(false);

  if (!data.ok) {
    setResult(`Error: ${data.error || "unknown"}`);
    return;
  }

  setResult(data.cv);

  // opcional: score ATS
  getAtsScore(data.cv);
}


  async function downloadDocx() {
    if (!result) return;

    const res = await fetch("/api/cv/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markdown: result,
        filename: "CV",
        photoDataUrl: includePhoto ? photoDataUrl : null,
      }),
    });

    if (!res.ok) {
      alert("Error generando DOCX");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CV.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

async function downloadPdf() {
  if (!result) return;

  const res = await fetch("/api/cv/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      markdown: result,
      filename: "CV",
      photoDataUrl: includePhoto ? photoDataUrl : null,
    }),
  });

  if (!res.ok) {
    alert("Error generando PDF");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "CV.pdf";
  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
}

  function onPhotoChange(file: File | null) {
    if (!file) {
      setPhotoDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Mejorar CV (ATS)</h1>
            <p className="text-sm text-gray-600">
              Pegá tu CV o subí un archivo. Optimiza para ATS con enfoque de RRHH sin inventar información.
            </p>
          </div>
<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
  <div>
    <label className="text-sm font-medium text-gray-700">Email (opcional)</label>
    <input
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="ej: ale@mail.com"
      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
    />
  </div>

  <div className="md:col-span-2">
    <label className="text-sm font-medium text-gray-700">LinkedIn (opcional)</label>
    <input
      value={linkedin}
      onChange={(e) => setLinkedin(e.target.value)}
      placeholder="linkedin.com/in/usuario"
      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
    />
  </div>
</div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Puesto objetivo</label>
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Ej: Administrativo, Customer Support, Contabilidad…"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
              />
              {targetRole.trim().length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Escribí el puesto objetivo para habilitar “Mejorar CV”.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">País</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as Country)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
              >
                {Object.entries(countryLabel).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Subir CV (PDF / DOCX / TXT)</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => extractFromFile(e.target.files?.[0] || null)}
                className="mt-2 block w-full text-sm"
              />
              {extracting && (
                <p className="mt-2 text-xs text-gray-600">Extrayendo texto del archivo…</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Foto (opcional)</label>
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={includePhoto}
                    onChange={(e) => setIncludePhoto(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Incluir
                </label>
              </div>

              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(e) => onPhotoChange(e.target.files?.[0] || null)}
                className="mt-2 block w-full text-sm"
              />

              {photoDataUrl ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <img src={photoDataUrl} alt="foto" className="h-32 w-full object-cover" />
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-500">
                  Para ATS “puro” suele omitirse. En LatAm a veces se usa.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-gray-700">CV (texto)</label>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Pegá tu CV acá…"
              className="mt-2 min-h-[220px] w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
{atsScore !== null && (
  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
    <div className="flex items-center justify-between">
      <div className="text-sm font-semibold text-gray-900">
        Score ATS: {atsScore}/10
      </div>
      <div className="text-xs text-gray-600">
        (heurístico, rápido)
      </div>
    </div>

    {atsDetails && (
      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        {atsDetails.map((c: any) => (
          <li key={c.id} className="text-xs text-gray-700">
            <span className={c.pass ? "text-green-700" : "text-red-700"}>
              {c.pass ? "✓" : "✗"}
            </span>{" "}
            {c.label}
          </li>
        ))}
      </ul>
    )}
  </div>
)}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={improveCV}
              disabled={!canImprove}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Procesando…" : "Mejorar CV"}
            </button>

            <button
              onClick={() => {
  gaEvent("download_docx", { tool: "improve" });
  requireUnlock(downloadDocx);
}}
              disabled={!result}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Descargar Word (.docx)
            </button>

            <button
              onClick={() => {
  gaEvent("download_pdf", { tool: "improve" });
  requireUnlock(downloadPdf);
}}
              disabled={!result}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Descargar PDF (ATS)
            </button>
          </div>

          {result && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-900">Resultado (Markdown)</h2>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-900 ring-1 ring-gray-200">
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>
<UnlockModal
  open={unlockOpen}
  onClose={() => setUnlockOpen(false)}
  onUnlocked={() => {
    gaEvent("unlock_completed", { tool: "improve cv" }); // en /tool poné tool: "tool"
    setUnlockOpen(false);
  }}
  loading={unlockBusy}
/>

    </main>
  );
}

