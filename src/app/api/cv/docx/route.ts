import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

function parseDataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return Buffer.from(match[2], "base64");
}

function stripBoldMarkers(s: string) {
  return s.replace(/\*\*/g, "");
}

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
}

function extractName(md: string) {
  const line = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  if (!line) return "";
  return stripBoldMarkers(line.replace(/^#\s+/, "").trim());
}

/**
 * Elimina el primer "# Nombre..." del markdown para que no se repita en el cuerpo.
 */
function removeTopNameHeading(md: string) {
  const lines = md.split(/\r?\n/);
  let removed = false;
  const out: string[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!removed && t.startsWith("# ")) {
      removed = true;
      continue;
    }
    out.push(raw);
  }

  return out.join("\n");
}

/**
 * Extrae el contenido de:
 * ## Datos de contacto
 * (líneas siguientes)
 * hasta el próximo heading "##"
 *
 * Devuelve:
 * - contactLines: líneas para cabecera
 * - bodyMarkdown: markdown sin esa sección
 */
function extractContactSection(md: string) {
  const lines = md.split(/\r?\n/);
  let inContact = false;
  const contactLines: string[] = [];
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    if (t === "## Datos de contacto") {
      inContact = true;
      continue; // omitimos el heading
    }

    if (inContact && t.startsWith("## ")) {
      inContact = false;
      bodyLines.push(raw); // este heading va al cuerpo
      continue;
    }

    if (inContact) {
      if (t) contactLines.push(stripBoldMarkers(t));
    } else {
      bodyLines.push(raw);
    }
  }

  return { contactLines, bodyMarkdown: bodyLines.join("\n") };
}

/**
 * Normaliza líneas de contacto para que NO salgan como bullets/guiones y
 * queden en 1–2 líneas tipo ATS:
 * L1: Tel/Email
 * L2: Ciudad/LinkedIn
 */
function normalizeContactLines(lines: string[]) {
  const clean = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^-+\s*/, "")); // quita "- " o "-- "

  const phone = clean.find((l) => /celular|tel[eé]fono|phone/i.test(l));
  const email = clean.find((l) => /@/.test(l));
  const linkedin = clean.find((l) => /linkedin/i.test(l));
  const location = clean.find((l) => /ciudad|ubicaci[oó]n|location/i.test(l));

  const line1Parts = [phone, email].filter(Boolean);
  const line2Parts = [location, linkedin].filter(Boolean);

  const out: string[] = [];
  if (line1Parts.length) out.push(line1Parts.join(" | "));
  if (line2Parts.length) out.push(line2Parts.join(" | "));

  // fallback: usa 2 líneas limpias
  if (!out.length) return clean.slice(0, 2);

  return out;
}

function headingParagraph(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  // Forzamos color negro para evitar tema (azul) en headings
  return new Paragraph({
    heading: level,
    children: [
      new TextRun({
        text: stripBoldMarkers(text),
        color: "000000",
      }),
    ],
  });
}

// Convierte Markdown básico a Paragraphs (sin tablas en el cuerpo)
function markdownToParagraphs(md: string) {
  const lines = md.split(/\r?\n/);
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
      continue;
    }

    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];

      const heading =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;

      paragraphs.push(headingParagraph(text, heading));
      continue;
    }

    if (t.startsWith("- ")) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: stripBoldMarkers(t.slice(2)),
              color: "000000",
            }),
          ],
        })
      );
      continue;
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: stripBoldMarkers(t),
            color: "000000",
          }),
        ],
      })
    );
  }

  return paragraphs;
}

function buildHeaderNoPhoto(name: string, contactLines: string[]) {
  const normalized = normalizeContactLines(contactLines);

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: name || "Nombre y Apellido",
          bold: true,
          size: 34, // ~17pt
          color: "000000",
        }),
      ],
    }),
  ];

  for (const line of normalized) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            color: "000000",
          }),
        ],
      })
    );
  }

  return children;
}

function buildHeaderWithPhoto(name: string, contactLines: string[], photoBuf: Buffer) {
  const normalized = normalizeContactLines(contactLines);

  const left: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: name || "Nombre y Apellido",
          bold: true,
          size: 34,
          color: "000000",
        }),
      ],
    }),
  ];

  for (const line of normalized) {
    left.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            color: "000000",
          }),
        ],
      })
    );
  }

  const right: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new ImageRun({
          data: photoBuf,
          transformation: { width: 110, height: 110 },
        }),
      ],
    }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: left,
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: right,
          }),
        ],
      }),
    ],
  });
}

export async function POST(req: Request) {
  try {
    const { markdown, filename = "CV", photoDataUrl } = await req.json();

    if (!markdown) {
      return NextResponse.json(
        { ok: false, error: "missing_markdown" },
        { status: 400 }
      );
    }

    const name = extractName(markdown);

    // 1) extrae contacto y elimina esa sección del cuerpo
    const { contactLines, bodyMarkdown } = extractContactSection(markdown);

    // 2) elimina el # Nombre del cuerpo para evitar duplicación
    const bodyNoName = removeTopNameHeading(bodyMarkdown);

    const photoBuf = photoDataUrl ? parseDataUrlToBuffer(photoDataUrl) : null;

    const children: any[] = [];

    // Header: con foto (tabla), sin foto (párrafos normales)
    if (photoBuf) {
      children.push(buildHeaderWithPhoto(name, contactLines, photoBuf));
    } else {
      children.push(...buildHeaderNoPhoto(name, contactLines));
    }

    // Espacio
    children.push(new Paragraph({ children: [new TextRun("")] }));

    // Cuerpo ATS lineal
    children.push(...markdownToParagraphs(bodyNoName));

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}.docx"`,
      },
    });
  } catch (err) {
    console.error("DOCX route error:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

