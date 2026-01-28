import { NextResponse } from "next/server";
import OpenAI from "openai";
import { CvCreateSchema } from "@/lib/schemas/cvCreateSchema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = CvCreateSchema.parse(body);

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

    // Bloque estructurado para el modelo (sin foto; foto se inyecta en PDF/DOCX después)
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
