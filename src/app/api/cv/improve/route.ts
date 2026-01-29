import { NextResponse } from "next/server";
import OpenAI from "openai";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

// --- Guardrails ---
const MAX_BODY_CHARS = 80_000;      // JSON total (aprox)
const MAX_CVTEXT_CHARS = 20_000;    // CV pegado
const MAX_TARGET_ROLE = 120;

const RL_LIMIT = 3;
const RL_TTL_SECONDS = 60 * 60 * 24;

async function getIP() {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

// ✅ Atomic rate limit: INCR + set EXPIRE only on first hit
async function rateLimitAtomic(key: string) {
  const lua = `
    local v = redis.call("INCR", KEYS[1])
    if v == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return v
  `;
  const n = await redis.eval(lua, 1, key, String(RL_TTL_SECONDS));
  return typeof n === "number" ? n : Number(n);
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }

    const body = JSON.parse(raw);

    const cvText = typeof body?.cvText === "string" ? body.cvText : "";
    const targetRole = typeof body?.targetRole === "string" ? body.targetRole : "";
    const country = typeof body?.country === "string" ? body.country : "MX";
    // email/linkedin los aceptamos pero no los usamos en prompt hoy (si querés los integramos luego)
    const email = typeof body?.email === "string" ? body.email : null;
    const linkedin = typeof body?.linkedin === "string" ? body.linkedin : null;

    const trackingId =
      typeof body?.trackingId === "string" && body.trackingId.trim()
        ? body.trackingId.trim()
        : null;

    if (!cvText || !targetRole) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    if (targetRole.length > MAX_TARGET_ROLE) {
      return NextResponse.json({ ok: false, error: "target_role_too_long" }, { status: 400 });
    }

    if (cvText.length > MAX_CVTEXT_CHARS) {
      return NextResponse.json({ ok: false, error: "cv_too_long" }, { status: 413 });
    }

    // 3) Rate limit por IP + trackingId (atomic)
    const ip = await getIP();

    const ipKey = `rl:cv_improve:ip:${ip}`;
    const nIp = await rateLimitAtomic(ipKey);
    if (nIp > RL_LIMIT) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    if (trackingId) {
      const tidKey = `rl:cv_improve:tid:${trackingId}`;
      const nTid = await rateLimitAtomic(tidKey);
      if (nTid > RL_LIMIT) {
        return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "missing_openai_key" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const systemPrompt = `
Eres una especialista senior en Recursos Humanos y optimización de CV para sistemas ATS,
con experiencia en el mercado laboral de ${country}.

Objetivo: reestructurar y mejorar el CV para maximizar probabilidades de entrevista,
usando únicamente información proporcionada por el candidato.

Resumen profesional:
- Debe tener entre 3 y 4 líneas.
- Enfócalo en el puesto objetivo.
- Incluye: rol principal, áreas de experiencia relevantes y cómo aporta valor.
- Evita frases genéricas (ej: “proactivo”, “responsable”).
- Debe sonar específico, profesional y alineado a reclutadores.

Reglas inviolables:
- NO inventes datos: experiencia, empresas, estudios, certificaciones, fechas, cargos, herramientas.
- NO inventes datos personales o de contacto que NO estén presentes en el CV original.
- SI un dato personal o de contacto aparece en el CV original (teléfono, email, LinkedIn),
  puedes conservarlo exactamente como está.
- Puedes eliminar información irrelevante o perjudicial.
- Puedes modificar la dirección para maximizar chances de éxito. Si es demasiado largo e incluye datos no necesarios, puedes acortarla (ej: solo ciudad y país).
- Puedes reescribir para claridad, impacto y ATS.
- Salida: SOLO el CV final en Markdown (sin tablas, sin columnas, sin emojis).
`.trim();

    const userPrompt = `
País objetivo: ${country}
Puesto objetivo: ${targetRole}

CV original del candidato:
${cvText}

Instrucciones (seguir estrictamente):

1) Adaptación al país:
- Usa español neutro y terminología de RRHH/ATS.

2) Depuración:
- Elimina información irrelevante, repetitiva o que reste profesionalismo.
- Elimina secciones vacías.

3) Experiencia:
- No inventes fechas. Si no existen, omítelas.
- Formato por rol:
  - Puesto — Empresa | (Fechas solo si existen)
    - Acción concreta + contexto + impacto cualitativo (sin inventar métricas).
- Evita listar tareas sin contexto.
- Prioriza logros/responsabilidades que se relacionen con el puesto objetivo.

4) ATS:
- Usa keywords naturales del puesto objetivo (sin stuffing).
- Verbos de acción y logros claros.
- Prioriza legibilidad humana además de compatibilidad ATS.

SALIDA FINAL (OBLIGATORIA):
- Devuelve SOLO Markdown.
- Debes usar headings con "# " y "## " exactamente.
- Viñetas SOLO con "- ".
- NO uses tablas ni columnas.
- NO uses placeholders entre corchetes.

Estructura obligatoria:
# Nombre y Apellido
## Datos de contacto
## Resumen profesional
## Competencias clave
## Experiencia laboral
## Educación (si no proporciona excluir)
## Cursos / Certificaciones (si no proporciona excluir)
## Idiomas (si no proporciona excluir)
## Herramientas / Tecnologías (si no proporciona excluir)
## Información adicional (si no proporciona excluir)
No puede decir en ningún lugar “no proporciona” o “no da información”.

Longitud:
- 1 página si junior/administrativo, máximo 2 si se justifica.
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
    console.error("Improve route error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "internal_error" },
      { status: err?.status || 500 }
    );
  }
}
