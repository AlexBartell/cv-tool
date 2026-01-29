"use client";
import UnlockModal from "@/components/UnlockModal";
import { useUnlock } from "@/lib/useUnlock";
import React, { useMemo, useState } from "react";
import { useEffect } from "react";
import { gaEvent } from "@/lib/ga";

type Country = "MX" | "CO" | "US";
type LangLevel = "Basico" | "Intermedio" | "Avanzado" | "Nativo";

type Experience = {
  title: string;
  company: string;
  location?: string;
  start?: string;
  end?: string;
  bullets: string[]; // responsabilidades/logros crudos
  topAchievement?: string;
};

type Education = {
  level:
    | "Secundaria"
    | "Tecnico"
    | "Licenciatura"
    | "Maestria"
    | "Doctorado"
    | "Bootcamp"
    | "Otro";
  degree?: string;
  school: string;
  status?: "En curso" | "Egresado" | "Incompleto";
  year?: string;
  location?: string;
  details?: string[];
};

type Language = { name: string; level: LangLevel };

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(16).slice(2);
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function downloadFromResponse(res: Response, filename: string) {
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function CreatePage() {
  const [step, setStep] = useState<number>(1);
  const [busy, setBusy] = useState(false); 
const [country, setCountry] = useState<Country>("MX");
const [includePhoto, setIncludePhoto] = useState<boolean>(country !== "US");
  // contacto / objetivo
 
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [stateOrRegion, setStateOrRegion] = useState("");
  const [phoneWhatsapp, setPhoneWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");

  const [targetRole, setTargetRole] = useState("");
  const [industry, setIndustry] = useState("");

  const [summary, setSummary] = useState("");
const [unlockOpen, setUnlockOpen] = useState(false);
const [unlockBusy, setUnlockBusy] = useState(false);
const [unlockError, setUnlockError] = useState<string | null>(null);
const { unlocked, setUnlockedTrue } = useUnlock();


function requireUnlock(action: () => void) {
  if (unlocked) return action();
  setUnlockError(null);
  setUnlockOpen(true);
}

function onUnlocked() {
  gaEvent("unlock_completed", { tool: "create" });
  setUnlockError(null);
  setUnlockOpen(false);
}
useEffect(() => {
  gaEvent("start_tool", { tool: "create" });
}, []);
useEffect(() => {
  if (country === "US") setIncludePhoto(false);
}, [country]);
  // foto (solo para pdf/docx)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  // experiencia / educación
  const [experiences, setExperiences] = useState<Array<Experience & { id: string }>>([
    { id: uid(), title: "", company: "", bullets: [] },
  ]);

  const [education, setEducation] = useState<Array<Education & { id: string }>>([
    { id: uid(), level: "Licenciatura", school: "" },
  ]);

  // skills / idiomas / certificaciones
  const [competencies, setCompetencies] = useState<string>(""); // comma list
  const [toolsTech, setToolsTech] = useState<string>(""); // comma list
  const [languages, setLanguages] = useState<Array<Language & { id: string }>>([]);
  const [certifications, setCertifications] = useState<string>(""); // newline list

  // outputs
  const [cvMarkdown, setCvMarkdown] = useState<string>("");
  const [score, setScore] = useState<{ score: number; out_of: number; criteria: any[] } | null>(null);

  const filenameBase = useMemo(() => {
    const n = fullName.trim() || "CV";
    return n.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "CV";
  }, [fullName]);

  const canGoNext = useMemo(() => {
    if (step === 1) return fullName.trim().length >= 2 && targetRole.trim().length >= 2;
    return true;
  }, [step, fullName, targetRole]);

  function addExperience() {
    setExperiences((xs) => [...xs, { id: uid(), title: "", company: "", bullets: [] }]);
  }

  function removeExperience(id: string) {
    setExperiences((xs) => xs.filter((x) => x.id !== id));
  }

  function updateExperience(id: string, patch: Partial<Experience>) {
    setExperiences((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addEducation() {
    setEducation((xs) => [...xs, { id: uid(), level: "Licenciatura", school: "" }]);
  }

  function removeEducation(id: string) {
    setEducation((xs) => xs.filter((x) => x.id !== id));
  }

  function updateEducation(id: string, patch: Partial<Education>) {
    setEducation((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function addLanguage() {
    setLanguages((xs) => [...xs, { id: uid(), name: "", level: "Intermedio" }]);
  }

  function removeLanguage(id: string) {
    setLanguages((xs) => xs.filter((x) => x.id !== id));
  }

  function updateLanguage(id: string, patch: Partial<Language>) {
    setLanguages((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function parseCommaList(s: string) {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function parseLines(s: string) {
    return s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function generateAll() {
    setBusy(true);
    setScore(null);
    setCvMarkdown("");

    try {
      // 1) payload para /api/cv/create (tu create/route.ts + schema actual)
      const payload = {
        targetRole,
        country,
        industry: industry || undefined,
        profile: {
          fullName,
          city: city || undefined,
          stateOrRegion: stateOrRegion || undefined,
          phoneWhatsapp: phoneWhatsapp || undefined,
          email: email || undefined,
          linkedin: linkedin || undefined,
          website: website || undefined,
        },
        summary: summary || undefined,
        experience: experiences
          .filter((e) => e.title.trim() && e.company.trim())
          .map((e) => ({
            title: e.title.trim(),
            company: e.company.trim(),
            location: e.location?.trim() || undefined,
            start: e.start?.trim() || undefined,
            end: e.end?.trim() || undefined,
            bullets: (e.bullets || []).map((b) => b.trim()).filter(Boolean),
            topAchievement: e.topAchievement?.trim() || undefined,
          })),
        education: education
          .filter((ed) => ed.school.trim())
          .map((ed) => ({
            level: ed.level,
            degree: ed.degree?.trim() || undefined,
            school: ed.school.trim(),
            status: ed.status || undefined,
            year: ed.year?.trim() || undefined,
            location: ed.location?.trim() || undefined,
            details: (ed.details || []).map((d) => d.trim()).filter(Boolean) || undefined,
          })),
        skills: {
          competencies: parseCommaList(competencies),
          toolsTech: parseCommaList(toolsTech),
        },
        languages: languages
          .filter((l) => l.name.trim())
          .map((l) => ({ name: l.name.trim(), level: l.level })),
        certifications: parseLines(certifications),
        // NO mandamos foto a create
      };
     const trackingId =
  localStorage.getItem("cpa_tracking_id_v1") ??
  (() => {
    const id = crypto.randomUUID();
    localStorage.setItem("cpa_tracking_id_v1", id);
    return id;
  })();


      const createRes = await fetch("/api/cv/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
  ...payload,
  trackingId,
})
      const createJson = await createRes.json();
      if (!createJson.ok) throw new Error(createJson.error || "create_failed");

      const md = String(createJson.cv || "");
      setCvMarkdown(md);

      // 2) score
      const scoreRes = await fetch("/api/cv/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markdown: md }),
      });
      const scoreJson = await scoreRes.json();
      if (scoreJson.ok) setScore(scoreJson);
    } catch (err) {
      console.error(err);
      alert("Error generando el CV. Mirá la consola para detalles.");
    } finally {
      setBusy(false);
      setStep(5);
    }
  }

  async function downloadPdf() {
    if (!cvMarkdown) return;
    const res = await fetch("/api/cv/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
  markdown: cvMarkdown,
  filename: filenameBase,
  photoDataUrl: includePhoto ? (photoDataUrl || undefined) : undefined,
}),
    });
    if (!res.ok) {
      alert("Error generando PDF");
      return;
    }
    await downloadFromResponse(res, `${filenameBase}.pdf`);
  }

  async function downloadDocx() {
    if (!cvMarkdown) return;
    const res = await fetch("/api/cv/docx", {
      method: "POST",
      headers: { "content-type": "application/json" },
body: JSON.stringify({
  markdown: cvMarkdown,
  filename: filenameBase,
  photoDataUrl: includePhoto ? (photoDataUrl || undefined) : undefined,
}),
    });
    if (!res.ok) {
      alert("Error generando DOCX");
      return;
    }
    await downloadFromResponse(res, `${filenameBase}.docx`);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crear CV desde cero</h1>
        <p className="mt-2 text-gray-600">
          Recolectá datos → score ATS → export PDF/DOCX.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
        {/* LEFT: Wizard */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Paso <span className="font-semibold text-gray-900">{step}</span> / 5
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={step === 1 || busy}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                Atrás
              </button>
              <button
                className="rounded-lg bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
                disabled={busy || (step < 5 && !canGoNext)}
                onClick={() => {
                  if (step < 5) setStep((s) => Math.min(5, s + 1));
                }}
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            {step === 1 && (
              <div className="space-y-4">
<div className="mt-3 flex items-center gap-2">
  <input
    id="includePhoto"
    type="checkbox"
    checked={includePhoto}
    onChange={(e) => setIncludePhoto(e.target.checked)}
  />
  <label htmlFor="includePhoto" className="text-sm text-gray-700">
    Incluir foto en PDF/DOCX
  </label>
</div>

                <h2 className="text-lg font-semibold">Identidad y objetivo</h2>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre y apellido *</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">País objetivo *</label>
                    <select
                      className="w-full rounded-lg border px-3 py-2"
                      value={country}
                      onChange={(e) => setCountry(e.target.value as Country)}
                    >
                      <option value="MX">México</option>
                      <option value="CO">Colombia</option>
                      <option value="US">EE.UU. (español)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Puesto objetivo *</label>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="Ej: Analista de Datos"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Industria (opcional)</label>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Ej: Fintech, Retail, Logística..."
                  />
                </div>

                <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  Tip: con Nombre + Puesto objetivo ya podemos generar. Todo lo demás mejora la calidad.
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Contacto y foto (opcional)</h2>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ciudad</label>
                    <input className="w-full rounded-lg border px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado/Región</label>
                    <input className="w-full rounded-lg border px-3 py-2" value={stateOrRegion} onChange={(e) => setStateOrRegion(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Teléfono/WhatsApp</label>
                  <input className="w-full rounded-lg border px-3 py-2" value={phoneWhatsapp} onChange={(e) => setPhoneWhatsapp(e.target.value)} placeholder="+52 ..." />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input className="w-full rounded-lg border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn</label>
                    <input className="w-full rounded-lg border px-3 py-2" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Website/Portfolio</label>
                  <input className="w-full rounded-lg border px-3 py-2" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Foto (opcional)</label>
                  <p className="text-xs text-gray-600">
                    {country === "US"
                      ? "Para procesos en EE.UU. generalmente NO se recomienda incluir foto."
                      : "En MX/CO es opcional. Usá una foto profesional si la incluís."}
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const dataUrl = await fileToDataUrl(f);
                      setPhotoDataUrl(dataUrl);
                    }}
                  />

                  {photoDataUrl && (
                    <div className="mt-2 flex items-center gap-3">
                      {/* preview */}
                      <img src={photoDataUrl} alt="Foto" className="h-16 w-16 rounded-lg object-cover border" />
                      <button
                        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                        onClick={() => setPhotoDataUrl(null)}
                        type="button"
                      >
                        Quitar foto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Experiencia</h2>

                <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  Pegá responsabilidades/logros crudos. El modelo los reescribe profesional y ATS-friendly sin inventar datos.
                </div>

                <div className="space-y-4">
                  {experiences.map((e, idx) => (
                    <div key={e.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Experiencia {idx + 1}</h3>
                        {experiences.length > 1 && (
                          <button
                            className="text-sm text-red-600 hover:underline"
                            type="button"
                            onClick={() => removeExperience(e.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Puesto *</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={e.title}
                            onChange={(ev) => updateExperience(e.id, { title: ev.target.value })}
                            placeholder="Ej: Ejecutivo de Ventas"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Empresa *</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={e.company}
                            onChange={(ev) => updateExperience(e.id, { company: ev.target.value })}
                            placeholder="Ej: ACME S.A."
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Inicio</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={e.start || ""}
                            onChange={(ev) => updateExperience(e.id, { start: ev.target.value })}
                            placeholder="Ej: Ene 2022"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Fin</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={e.end || ""}
                            onChange={(ev) => updateExperience(e.id, { end: ev.target.value })}
                            placeholder="Ej: Actual"
                          />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <label className="text-sm font-medium">Ubicación (opcional)</label>
                        <input
                          className="w-full rounded-lg border px-3 py-2"
                          value={e.location || ""}
                          onChange={(ev) => updateExperience(e.id, { location: ev.target.value })}
                          placeholder="Ej: Guadalajara, MX"
                        />
                      </div>

                      <div className="mt-3 space-y-2">
                        <label className="text-sm font-medium">Logro principal (opcional)</label>
                        <input
                          className="w-full rounded-lg border px-3 py-2"
                          value={e.topAchievement || ""}
                          onChange={(ev) => updateExperience(e.id, { topAchievement: ev.target.value })}
                          placeholder='Ej: "Mejoré el proceso de cobranza y reduje atrasos"'
                        />
                      </div>

                      <div className="mt-3 space-y-2">
                        <label className="text-sm font-medium">Responsabilidades / logros (1 por línea)</label>
                        <textarea
                          className="w-full rounded-lg border px-3 py-2"
                          rows={5}
                          value={(e.bullets || []).join("\n")}
                          onChange={(ev) => updateExperience(e.id, { bullets: ev.target.value.split("\n") })}
                          placeholder={
                            "Ej:\nGestioné cartera de clientes B2B\nCoordiné entregas con logística\nImplementé reportes semanales en Excel"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full rounded-xl border px-4 py-2 hover:bg-gray-50"
                  type="button"
                  onClick={addExperience}
                >
                  + Agregar otra experiencia
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Educación, skills e idiomas</h2>

                <div className="space-y-4">
                  {education.map((ed, idx) => (
                    <div key={ed.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Educación {idx + 1}</h3>
                        {education.length > 1 && (
                          <button
                            className="text-sm text-red-600 hover:underline"
                            type="button"
                            onClick={() => removeEducation(ed.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nivel</label>
                          <select
                            className="w-full rounded-lg border px-3 py-2"
                            value={ed.level}
                            onChange={(e) => updateEducation(ed.id, { level: e.target.value as any })}
                          >
                            <option>Secundaria</option>
                            <option>Tecnico</option>
                            <option>Licenciatura</option>
                            <option>Maestria</option>
                            <option>Doctorado</option>
                            <option>Bootcamp</option>
                            <option>Otro</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Institución *</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={ed.school}
                            onChange={(e) => updateEducation(ed.id, { school: e.target.value })}
                            placeholder="Ej: Universidad X"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Carrera/Título</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={ed.degree || ""}
                            onChange={(e) => updateEducation(ed.id, { degree: e.target.value })}
                            placeholder="Ej: Administración"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Estado</label>
                          <select
                            className="w-full rounded-lg border px-3 py-2"
                            value={ed.status || ""}
                            onChange={(e) => updateEducation(ed.id, { status: (e.target.value || undefined) as any })}
                          >
                            <option value="">—</option>
                            <option value="En curso">En curso</option>
                            <option value="Egresado">Egresado</option>
                            <option value="Incompleto">Incompleto</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Año/Periodo</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={ed.year || ""}
                            onChange={(e) => updateEducation(ed.id, { year: e.target.value })}
                            placeholder="Ej: 2018-2022"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ubicación</label>
                          <input
                            className="w-full rounded-lg border px-3 py-2"
                            value={ed.location || ""}
                            onChange={(e) => updateEducation(ed.id, { location: e.target.value })}
                            placeholder="Ej: Bogotá, CO"
                          />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <label className="text-sm font-medium">Detalles (opcional, 1 por línea)</label>
                        <textarea
                          className="w-full rounded-lg border px-3 py-2"
                          rows={3}
                          value={(ed.details || []).join("\n")}
                          onChange={(e) => updateEducation(ed.id, { details: e.target.value.split("\n") })}
                          placeholder={"Ej:\nProyecto final: ...\nPromedio: ..."}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="w-full rounded-xl border px-4 py-2 hover:bg-gray-50"
                  type="button"
                  onClick={addEducation}
                >
                  + Agregar otra educación
                </button>

                <div className="mt-6 grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Competencias clave (coma)</label>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={competencies}
                      onChange={(e) => setCompetencies(e.target.value)}
                      placeholder="Ej: Ventas B2B, negociación, atención al cliente..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Herramientas / Tecnologías (coma)</label>
                    <input
                      className="w-full rounded-lg border px-3 py-2"
                      value={toolsTech}
                      onChange={(e) => setToolsTech(e.target.value)}
                      placeholder="Ej: Excel, Power BI, SAP, SQL..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cursos / Certificaciones (1 por línea)</label>
                    <textarea
                      className="w-full rounded-lg border px-3 py-2"
                      rows={3}
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      placeholder={"Ej:\nExcel Avanzado (2024)\nScrum Fundamentals (2023)"}
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Idiomas</h3>
                    <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50" type="button" onClick={addLanguage}>
                      + Agregar
                    </button>
                  </div>

                  {languages.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-600">Opcional. Agregá si aplica.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {languages.map((l) => (
                        <div key={l.id} className="grid grid-cols-[1fr_160px_80px] gap-2">
                          <input
                            className="rounded-lg border px-3 py-2"
                            value={l.name}
                            onChange={(e) => updateLanguage(l.id, { name: e.target.value })}
                            placeholder="Ej: Inglés"
                          />
                          <select
                            className="rounded-lg border px-3 py-2"
                            value={l.level}
                            onChange={(e) => updateLanguage(l.id, { level: e.target.value as LangLevel })}
                          >
                            <option value="Basico">Básico</option>
                            <option value="Intermedio">Intermedio</option>
                            <option value="Avanzado">Avanzado</option>
                            <option value="Nativo">Nativo</option>
                          </select>
                          <button
                            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                            type="button"
                            onClick={() => removeLanguage(l.id)}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <label className="text-sm font-medium">Resumen profesional (opcional)</label>
                  <textarea
                    className="w-full rounded-lg border px-3 py-2"
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Si lo dejás vacío, lo generamos automáticamente con el resto."
                  />
                </div>

                <button
                  className="mt-3 w-full rounded-xl bg-black px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  disabled={busy || !canGoNext}
                  type="button"
                  onClick={() => requireUnlock(generateAll)}
                >
                  {busy ? "Generando..." : "Generar CV + Score"}
                </button>
              </div>
            )}

           {step === 5 && (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Exportar</h2>

    {!cvMarkdown ? (
      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
        Aún no generaste el CV. Volvé a los pasos anteriores y presioná
        <strong> “Generar CV + Score”</strong>.
      </div>
    ) : (
      <>
        {score && (
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Score ATS</p>
                <p className="text-2xl font-bold">
                  {score.score} / {score.out_of}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Evaluación estructural basada en criterios ATS reales
                </p>
              </div>

              <div
                className={classNames(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  score.score >= 8
                    ? "bg-green-100 text-green-800"
                    : score.score >= 6
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                )}
              >
                {score.score >= 8
                  ? "Listo para aplicar"
                  : score.score >= 6
                  ? "Aplicable con mejoras"
                  : "Necesita ajustes"}
              </div>
            </div>

            {/* CRITERIOS */}
            <div className="mt-4 space-y-2">
              {score.criteria?.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <span className="text-gray-700">{c.label}</span>
                  <span
                    className={classNames(
                      "font-medium",
                      c.pass ? "text-green-700" : "text-red-700"
                    )}
                  >
                    {c.pass ? "OK" : "Falta"}
                  </span>
                </div>
              ))}
            </div>

            {(score as any).warnings?.length ? (
              <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900">
                <p className="mb-1 font-medium">Sugerencias de mejora</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(score as any).warnings.map((w: string) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {/* 🔒 LOCK STATUS (D) */}
        {!unlocked ? (
          <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  Desbloqueo requerido
                </p>
                <p className="mt-1 text-sm">
                  Para <span className="font-medium">generar y descargar</span>{" "}
                  tu CV, ingresá el código que recibiste al completar la
                  oferta gratuita.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  La oferta es un{" "}
                  <span className="font-medium">fill-in gratuito</span> para
                  cubrir costos de operación de esta IA especializada (sin
                  tarjeta).
                </p>
              </div>

              <button
                className="shrink-0 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                type="button"
                onClick={() => setUnlockOpen(true)}
              >
                Ingresar código
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-green-50 p-4 text-sm text-green-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-green-900">
                  Desbloqueado ✅
                </p>
                <p className="mt-1 text-sm">
                  Ya podés generar y descargar tu CV en PDF y Word.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Acceso activo
              </span>
            </div>
          </div>
        )}

        {/* EXPORT BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="rounded-xl border px-4 py-3 hover:bg-gray-50 disabled:opacity-50"
            disabled={busy}
           onClick={() => {
  gaEvent("download_pdf", { tool: "create" });
  requireUnlock(downloadPdf);
}}
            type="button"
          >
            Descargar PDF
          </button>
          <button
            className="rounded-xl border px-4 py-3 hover:bg-gray-50 disabled:opacity-50"
            disabled={busy}
            onClick={() => {
  gaEvent("download_docx", { tool: "create" });
  requireUnlock(downloadDocx);
}}
            type="button"
          >
            Descargar Word
          </button>
        </div>

        <p className="text-xs text-gray-600">
          La foto (si la cargaste) se inserta únicamente en PDF/DOCX.  
          El contenido del CV se genera sin foto para máxima compatibilidad ATS.
        </p>
      </>
    )}
  </div>
)}
</div>
</section>

{/* RIGHT: Preview */}
<section className="rounded-2xl border bg-white p-5 shadow-sm">
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold">Preview (Markdown)</h2>
    {cvMarkdown && (
      <button
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(cvMarkdown);
          alert("Copiado al portapapeles");
        }}
      >
        Copiar
      </button>
    )}
  </div>

  {!cvMarkdown ? (
    <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
      Cuando generes el CV, acá vas a ver el Markdown final.
    </div>
  ) : (
    <pre className="mt-4 max-h-[70vh] overflow-auto rounded-xl bg-gray-900 p-4 text-sm text-gray-100">
      {cvMarkdown}
    </pre>
  )}
</section>
</div>

{/* 🔐 UNLOCK MODAL */}
<UnlockModal
  open={unlockOpen}
  onClose={() => setUnlockOpen(false)}
  onUnlocked={() => {
    setUnlockedTrue();      // 🔥 esto es lo que faltaba
    setUnlockOpen(false);
    gaEvent("unlock_completed", { tool: "create" }); // o "create"
  }}
/>

</main>
);
}


