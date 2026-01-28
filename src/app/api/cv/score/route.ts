import { NextResponse } from "next/server";

export const runtime = "nodejs";

function hasSection(md: string, title: string) {
  const re = new RegExp(
    `^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "mi"
  );
  return re.test(md);
}

function extractSection(md: string, heading: string) {
  const lines = md.split(/\r?\n/);
  let inSec = false;
  const out: string[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (t === `## ${heading}`) {
      inSec = true;
      continue;
    }
    if (inSec && t.startsWith("## ")) break;
    if (inSec) out.push(raw);
  }
  return out.join("\n").trim();
}

function extractName(md: string) {
  const m = md.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() || "";
}

function hasContact(md: string) {
  const lower = md.toLowerCase();
  return (
    lower.includes("celular") ||
    lower.includes("teléfono") ||
    lower.includes("telefono") ||
    lower.includes("@") ||
    lower.includes("linkedin")
  );
}

function containsEmoji(md: string) {
  return /[\u{1F300}-\u{1FAFF}]/u.test(md);
}

function containsTableLike(md: string) {
  return /\|.+\|/.test(md) && /\n\|[-:\s|]+\|/.test(md);
}

function approxLengthOk(md: string) {
  const chars = md.replace(/\s+/g, " ").trim().length;
  return chars >= 800 && chars <= 7000;
}

function parseExperienceRoles(md: string) {
  const exp = extractSection(md, "Experiencia laboral");
  if (!exp) return [];

  const lines = exp
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  type Role = { header: string; bullets: string[] };
  const roles: Role[] = [];

  let current: Role | null = null;

  for (const line of lines) {
    const isBullet = line.startsWith("- ");
    const looksLikeHeader = !isBullet && line.includes("—"); // tu formato estándar

    if (looksLikeHeader) {
      if (current) roles.push(current);
      current = { header: line, bullets: [] };
      continue;
    }

    if (!current) current = { header: "Experiencia", bullets: [] };

    if (isBullet) current.bullets.push(line.slice(2).trim());
  }

  if (current) roles.push(current);
  return roles.filter((r) => r.header || r.bullets.length);
}

function bulletsSufficientByRole(md: string, minPerRole = 2) {
  const roles = parseExperienceRoles(md);
  if (roles.length === 0) return { pass: false, roles: [] as any[] };

  const report = roles.map((r) => ({
    header: r.header,
    bullets: r.bullets.length,
    ok: r.bullets.length >= minPerRole,
  }));

  const pass = report.every((r) => r.ok);
  return { pass, roles: report };
}

function bulletQualityWarnings(md: string) {
  const roles = parseExperienceRoles(md);
  const warnings: string[] = [];

  const genericPatterns = [
    /responsable de/i,
    /apoy[ée] en/i,
    /tareas administrativas/i,
    /varias funciones/i,
  ];

  for (const r of roles) {
    for (const b of r.bullets) {
      if (b.length < 18) warnings.push(`Bullet muy corto: "${b}"`);
      if (genericPatterns.some((re) => re.test(b)))
        warnings.push(`Bullet muy genérico: "${b}"`);
    }
  }

  return Array.from(new Set(warnings)).slice(0, 6);
}

export async function POST(req: Request) {
  try {
    const { markdown } = await req.json();
    if (!markdown) {
      return NextResponse.json(
        { ok: false, error: "missing_markdown" },
        { status: 400 }
      );
    }

    const expRolesCheck = bulletsSufficientByRole(markdown, 2);
    const warnings = bulletQualityWarnings(markdown);

    const criteria = [
      { id: "name", label: "Incluye nombre (# ...)", pass: extractName(markdown).length >= 4 },
      { id: "contact", label: "Tiene datos de contacto", pass: hasContact(markdown) },
      { id: "summary", label: "Incluye Resumen profesional", pass: hasSection(markdown, "Resumen profesional") },
      { id: "skills", label: "Incluye Competencias clave", pass: hasSection(markdown, "Competencias clave") },
      { id: "exp", label: "Incluye Experiencia laboral", pass: hasSection(markdown, "Experiencia laboral") },
      {
        id: "expBullets",
        label: "Experiencia con bullets suficientes (≥2 por puesto)",
        pass: expRolesCheck.pass,
        detail: expRolesCheck.roles,
      },
      { id: "edu", label: "Incluye Educación", pass: hasSection(markdown, "Educación") },
      { id: "tools", label: "Incluye Herramientas / Tecnologías", pass: hasSection(markdown, "Herramientas / Tecnologías") },
      { id: "noTables", label: "Sin tablas/columnas (Markdown)", pass: !containsTableLike(markdown) },
      { id: "noEmoji", label: "Sin emojis", pass: !containsEmoji(markdown) },
      { id: "length", label: "Extensión razonable", pass: approxLengthOk(markdown) },
    ];

    const pick = ["name","contact","summary","skills","exp","expBullets","edu","tools","noTables","noEmoji"] as const;
    const picked = criteria.filter((c) => pick.includes(c.id as any));
    const score = picked.reduce((acc, c) => acc + (c.pass ? 1 : 0), 0);

    return NextResponse.json({
      ok: true,
      score,
      out_of: 10,
      criteria: picked,
      warnings,
    });
  } catch (err) {
    console.error("score error:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

