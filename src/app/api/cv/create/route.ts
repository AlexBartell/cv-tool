import { NextResponse } from "next/server";
import OpenAI from "openai";
import { CvCreateSchema } from "@/lib/schemas/cvCreateSchema";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

// --- Guardrails (ajustables) ---
const MAX_BODY_CHARS = 60_000;      // tamaño total del JSON recibido (aprox)
const MAX_TARGET_ROLE = 120;        // rol objetivo
const MAX_FIELD_CHARS = 12_000;     // límite para campos largos (summary, bullets concatenados, etc.)

const RL_LIMIT = 3;                // 3 generaciones
const RL_TTL_SECONDS = 60 * 60 * 24; // por 24h

function getIP() {
  const h = headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

function safeLen(v: unknown) {
  return typeof v === "string" ? v.length : 0;
}

function sumTextSize(input: any) {
  // Sumamos texto “caro” en tokens. No perfecto, pero efectivo.
  let total = 0;

  total += safeLen(input?.targetRole);
  total += safeLen(input?.industry);
  total += safeLen(input?.summary);

  const prof = input?.profile ?? {};
  total += safeLen(prof?.fullName);
  total += safeLen(prof?.city);
  total += safeLen(prof?.stateOrRegion);
  total += safeLen(prof?.phoneWhatsapp);
  total += safeLen(prof?.email);
  total += safeLen(prof?.linkedin);
  total += safeLen(prof?.website);

  for (const e of input?.experience ?? []) {
    total += safeLen(e?.title);
    total += safeLen(e?.company);
    total += safeLen(e?.location);
    total += safeLen(e?.start);
    total += safeLen(e?.end);
    total += safeLen(e?.topAchievement);
    for (const b of e?.bullets ?? []) total += safeLen(b);
  }

  for (const ed of input?.education ?? []) {
    total += safeLen(ed?.level);
    total += safeLen(ed?.school);
    total += safeLen(ed?.degree);
    total += safeLen(ed?.status);
    total += safeLen(ed?.year);
    total += safeLen(ed?.location);
    for (const d of ed?.details ?? []) total += safeLen(d);
  }

  for (const c of input?.certifications ?? []) total += safeLen(c);

  for (const p of input?.projects ?? []) {
    total += safeLen(p?.name);
    total += safeLen(p?.link);
    for (const b of p?.bullets ?? []) total += safeLen(b);
  }

  for (const l of input?.languages ?? []) {
    total += safeLen(l?.name);
    total += safeLen(l?.level);
  }

  const skills = input?.skills ?? {};
  for (const s of skills?.competencies ?? []) total += safeLen(s);
  for (const t of skills?.toolsTech ?? []) total += safeLen(t);

  return total;
}

async function incrWithTTL(key: string) {
  // ioredis: incr + expire (solo si es primera vez)
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, RL_TTL_SECONDS);
  return n;
}

export async function POST(req: Request) {
  try {
    // 1) Leer raw text para limitar tamaño ANTES de parsear
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json(
        { ok: false, error: "payload_too_large" },
        { status: 413 }
      );
    }

    const body = JSON.parse(raw);

    // trackingId opcional (viene del frontend/localStorage)
    const trackingId =
      typeof body?.trackingId === "string" && body.trackingId.trim()
        ? body.trackingId.trim()
        : null;

    // Si tu schema fuera strict, evitamos que falle:
    const bodyForSchema = { ...body };
    delete (bodyForSchema as any).trackingId;

    // 2) Rate limit por IP + trackingId (si existe)
    const ip = getIP();
    const ipKey = `rl:cv_create:ip:${ip}`;
    const nIp = await incrWithTTL(ipKey);
    if (nIp > RL_LIMIT) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429 }
      );
    }

    if (trackingId) {
      const tidKey = `rl:cv_create:tid:${trackingId}`;
      const nTid = await incrWithTTL(tidKey);
      if (nTid > RL_LIMIT) {
        return NextResponse.json(
          { ok: false, error: "rate_limited" },
          { status: 429 }
        );
      }
    }

    // 3) Validación de schema
    const input = CvCreateSchema.parse(bodyForSchema);

    // 4) Límites de longitud por campos “caros”
    if (input.targetRole?.length > MAX_TARGET_ROLE) {
      return NextResponse.json(
        { ok: false, error: "target_role_too_long" },
        { status: 400 }
      );
    }

    const totalText = sumTextSize(input);
    if (totalText > MAX_FIELD_CHARS) {
      return NextResponse.json(
        { ok: false, error: "text_too_long" },
        { status: 413 }
      );
    }

    const { targetRole, country = "MX" } = input;

    if (!targetRole) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "missing_openai_key" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const countryHuman =
      country === "MX"
        ? "México"
        : country === "CO"
        ? "Colombia"
        : "Estados Unidos (hispano)";

    const systemPrompt = `
Eres una especialista senior en Recursos Humanos y optimización de CV para sistemas ATS,
con experiencia en el mercado laboral de ${countryHuman}.

Objetivo: crear un CV completo desde cero para maximizar probabilidades de entrevista,
usando únicamente información proporcionada por el candidato.

Reglas inviolables:
- NO inventes datos: experiencia, empresas, estudios, certificaciones, fechas, cargos, herramientas, idiomas, logros numéricos.
- Si falta un dato, omítelo o redacta de forma general SIN agregar hechos nuevos.
- NO inventes datos personales o de contacto. Usa email/LinkedIn/teléfono SOLO si fueron proporcionados.
- No uses tablas, no uses columnas, no uses emojis.
- Salida: SOLO el CV final en Markdown.
- Debes usar headings con "# " y "## " exactamente.
- Viñetas SOLO con "- " (guion + espacio). No uses "•".
- NO uses placeholders entre corchetes. Debe quedar listo para enviar.
- NO incluyas secciones vacías.
- NO muestres encabezados cuya información no exista.
- Si una sección no tiene contenido real, ELIMÍNALA por completo.
- En particular, NO incluyas "Información adicional" si el candidato no proporcionó datos.
- NUNCA escribas frases como "(No se proporcionó información...)".
`.trim();

    const candidateBlock = `
DATOS DEL CANDIDATO:
Nombre: ${input.profile.fullName}
Ubicación: ${[input.profile.city, input.profile.stateOrRegion].filter(Boolean).join(", ") || ""}
Teléfono/WhatsApp: ${input.profile.phoneWhatsapp || ""}
Email: ${input.profile.email || ""}
LinkedIn: ${input.profile.linkedin || ""}
Website/Portfolio: ${input.profile.website || ""}

Puesto objetivo: ${input.targetRole}
Industria (si aplica): ${input.industry || ""}

Resumen aportado por el candidato (si está vacío, crear uno):
${input.summary || ""}

EXPERIENCIA:
${(input.experience ?? [])
  .map((e, i) => {
    const dates = [e.start, e.end].filter(Boolean).join(" - ");
    const header = `${i + 1}) Puesto: ${e.title} | Empresa: ${e.company}${
      e.location ? ` | Ubicación: ${e.location}` : ""
    }${dates ? ` | Fechas: ${dates}` : ""}`;

    const ach = e.topAchievement ? `Logro principal (si existe): ${e.topAchievement}` : "";
    const bullets = (e.bullets ?? []).map((b) => `- ${b}`).join("\n");
    return [header, ach, bullets].filter(Boolean).join("\n");
  })
  .join("\n\n")}

EDUCACIÓN:
${(input.education ?? [])
  .map((ed, i) => {
    return `${i + 1}) Nivel: ${ed.level}
Institución: ${ed.school}
Carrera/Título: ${ed.degree || ""}
Estado: ${ed.status || ""}
Año/Periodo: ${ed.year || ""}
Ubicación: ${ed.location || ""}
Detalles: ${(ed.details ?? []).join(" | ") || ""}`.trim();
  })
  .join("\n\n")}

COMPETENCIAS (funcionales/soft):
${(input.skills?.competencies ?? []).join(", ")}

HERRAMIENTAS / TECNOLOGÍAS:
${(input.skills?.toolsTech ?? []).join(", ")}

IDIOMAS:
${(input.languages ?? []).map((l) => `${l.name}: ${l.level}`).join(" | ")}

CURSOS / CERTIFICACIONES:
${(input.certifications ?? []).join(" | ")}

PROYECTOS (si aplica):
${(input.projects ?? [])
  .map((p, i) => {
    const link = p.link ? `Link: ${p.link}` : "";
    const bullets = (p.bullets ?? []).map((b) => `- ${b}`).join("\n");
    return [`${i + 1}) ${p.name}`, link, bullets].filter(Boolean).join("\n");
  })
  .join("\n\n")}

(US opcional) Permiso de trabajo:
${
  country === "US" && input.usWork
    ? `Autorización: ${input.usWork.workAuthorization}${
        input.usWork.requiresSponsorship ? ` | Sponsorship: ${input.usWork.requiresSponsorship}` : ""
      }`
    : ""
}
`.trim();

    const userPrompt = `
País objetivo: ${countryHuman}
Puesto objetivo: ${targetRole}

Instrucciones (seguir estrictamente):

1) Adaptación por país:
- Español neutro orientado a ${countryHuman}.
- Si el país es US: NO incluyas documentos/IDs. No menciones foto. Mantén enfoque ATS.
- Si el país es MX/CO: lenguaje profesional, sin datos sensibles.

2) Resumen profesional:
- 3 a 4 líneas.
- Específico y alineado al puesto objetivo.
- Evita frases vacías (“proactivo”, “responsable”) sin contexto.

3) Datos de contacto:
- En "## Datos de contacto" pon SOLO lo que exista (tel/email/linkedin/ubicación).
- Ideal 1–2 líneas máximas, sin bullets si podés (aunque el renderer lo tolera).

4) Competencias / Herramientas:
- En "## Competencias clave" resume 6–10 competencias relevantes (sin inventar; deriva de skills/experiencia).
- En "## Herramientas / Tecnologías" lista herramientas/tech proporcionadas.

5) Experiencia:
- No inventes fechas. Si faltan, omítelas.
- Formato:
  - Puesto — Empresa | (Fechas solo si existen)
    - Acción + contexto + impacto cualitativo (sin inventar métricas).
- Si bullets faltan o vienen muy pobres, reescríbelos a mejor forma SIN inventar hechos.

6) Secciones vacías:
- Elimina completamente secciones que queden vacías (no dejes headings sin contenido).

SALIDA FINAL (OBLIGATORIA):
- Devuelve SOLO Markdown.
- Debes usar headings con "# " y "## " exactamente.
- Viñetas SOLO con "- ".
- NO uses tablas ni columnas.
- NO uses emojis.
- NO uses placeholders.

Estructura obligatoria (usa exactamente estos encabezados):
# Nombre y Apellido
## Datos de contacto
## Resumen profesional
## Competencias clave
## Experiencia laboral
## Educación
## Cursos / Certificaciones
## Idiomas
## Herramientas / Tecnologías
## Información adicional (SOLO si el candidato aportó datos)

Contenido del candidato:
${candidateBlock}
`.trim();

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const result = response.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, cv: result });
  } catch (err: any) {
    console.error("Create route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "internal_error" },
      { status: err?.status || 500 }
    );
  }
}
