// app/api/docx/route.ts
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

export const runtime = "nodejs"; // ✅ Vercel: evita Edge (Buffer + sharp)

type RasterImageType = "jpg" | "png";

/**
 * Lee data URL: data:image/png;base64,....
 */
function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  const mime = match[1]; // "image/jpeg" | "image/png" | "image/webp" | ...
  const buf = Buffer.from(match[2], "base64");
  return { mime, buf };
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
 * Extrae:
 * ## Datos de contacto
 * (líneas)
 * hasta el próximo ## ...
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
      continue;
    }

    if (inContact && t.startsWith("## ")) {
      inContact = false;
      bodyLines.push(raw);
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
 * Normaliza líneas de contacto (sin bullets) en 1-2 líneas tipo ATS
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

  if (!out.length) return clean.slice(0, 2);
  return out;
}

function headingParagraph(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel]
) {
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

/**
 * Markdown básico a Paragraphs (sin tablas en el cuerpo)
 */
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
          size: 34,
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

function buildHeaderWithPhoto(
  name: string,
  contactLines: string[],
  photoBuf: Buffer,
  photoType: RasterImageType
) {
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
          type: photoType, // ✅ ahora sí existe
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

/**
 * Convierte WEBP -> PNG/JPG porque docx suele fallar con WEBP.
 * - Usa import dinámico para que no reviente builds si sharp no está instalado aún.
 */
async function ensureDocxCompatibleImage(input: {
  mime: string;
  buf: Buffer;
}): Promise<{ buf: Buffer; type: RasterImageType }> {
  const { mime, buf } = input;

  // PNG
  if (/png/i.test(mime)) return { buf, type: "png" };

  // JPEG/JPG
  if (/jpe?g/i.test(mime)) return { buf, type: "jpg" };

  // WEBP -> convertir
  if (/webp/i.test(mime)) {
    // Preferimos convertir a PNG por compatibilidad
    try {
      const sharp = (await import("sharp")).default;
      const out = await sharp(buf).png().toBuffer();
      return { buf: out, type: "png" };
    } catch (e) {
      // Si no hay sharp, devolvemos error claro
      throw new Error("webp_not_supported_missing_sharp");
    }
  }

  // Otros formatos: intentamos convertir a PNG con sharp
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf).png().toBuffer();
    return { buf: out, type: "png" };
  } catch (e) {
    throw new Error("unsupported_image_type");
  }
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

    // 1) extrae contacto y lo quita del cuerpo
    const { contactLines, bodyMarkdown } = extractContactSection(markdown);

    // 2) evita duplicar "# Nombre"
    const bodyNoName = removeTopNameHeading(bodyMarkdown);

    // Foto (opcional)
    let photoBuf: Buffer | null = null;
    let photoType: RasterImageType | null = null;

    if (photoDataUrl) {
      const parsed = parseDataUrl(photoDataUrl);
      if (parsed) {
        // Asegurar formato soportado por docx
        const converted = await ensureDocxCompatibleImage(parsed);
        photoBuf = converted.buf;
        photoType = converted.type;
      }
    }

    const children: any[] = [];

    // Header con foto / sin foto
    if (photoBuf && photoType) {
      children.push(buildHeaderWithPhoto(name, contactLines, photoBuf, photoType));
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
  } catch (err: any) {
    console.error("DOCX route error:", err);

    // Errores “predecibles” para Vercel/runtime
    const msg = String(err?.message || err);
    if (msg.includes("webp_not_supported_missing_sharp")) {
      return NextResponse.json(
        {
          ok: false,
          error: "webp_not_supported",
          hint: "Instalá sharp (npm i sharp) o mandá la foto como PNG/JPG.",
        },
        { status: 400 }
      );
    }

    if (msg.includes("unsupported_image_type")) {
      return NextResponse.json(
        { ok: false, error: "unsupported_image_type" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

