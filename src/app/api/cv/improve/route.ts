import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { cvText, targetRole, country = "MX", email, linkedin } = await req.json();

    if (!cvText || !targetRole) {
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
- Puedes modificar la dirección tal que maximicé chances de exito. Si es demasiado largo e incluyé datos no necesarios podes modificarla. Quizas consideras que solo es necesaria ciudad y pais, entonces podes eliminar calle, etc. Hacelo segun tu opinion experta!
- Puedes reescribir para claridad, impacto y ATS.
- Salida: SOLO el CV final en Markdown (sin tablas, sin columnas, sin emojis).
`;



    const userPrompt = `
País objetivo: ${country}
Puesto objetivo: ${targetRole}

CV original del candidato:
${cvText}

Instrucciones (seguir estrictamente):

1) Adaptación al país (México):
- No uses "C.I." ni documentos de otros países.
- Usa español neutro (México) y terminología de RRHH/ATS.

2) Depuración:
- Elimina información irrelevante, repetitiva o que reste profesionalismo.
- Elimina secciones vacías.

3) Experiencia:
- No inventes fechas. Si no existen, omítelas.
- Formato por rol:
  - Puesto — Empresa | (Fechas solo si existen)
    - Acción concreta + contexto del trabajo + impacto cualitativo (sin inventar métricas).
- Si no hay métricas en el CV original, describe impacto de forma cualitativa
  (ej: “mejorando la organización del área”, “asegurando continuidad operativa”).
- Evita listar tareas sin contexto.
- Prioriza logros o responsabilidades que se relacionen con el puesto objetivo.


4) ATS:
- Usa keywords naturales del puesto objetivo (sin stuffing).
- Verbos de acción y logros claros.
- Prioriza legibilidad humana además de compatibilidad ATS.


SALIDA FINAL (OBLIGATORIA):
- Devuelve SOLO Markdown.
- Debes usar headings con "# " y "## " exactamente.
- Viñetas SOLO con "- " (guion + espacio). No uses "•".
- NO uses placeholders entre corchetes. El CV debe quedar listo para enviar.

Estructura obligatoria (usa exactamente estos encabezados):
# Nombre y Apellido
## Datos de contacto
## Resumen profesional
## Competencias clave
## Experiencia laboral 
## Educación (si no proporciona excluir)
## Cursos / Certificaciones(si no proporciona excluir)
## Idiomas(si no proporciona excluir)
## Herramientas / Tecnologías(si no proporciona excluir)
## Información adicional(si no proporciona excluir)
no puede decir en ningun lugar no proporciona o no da informacion!
Longitud:
- 1 página si junior/administrativo, máximo 2 si se justifica.
`;


    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt.trim() },
        { role: "user", content: userPrompt.trim() },
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

