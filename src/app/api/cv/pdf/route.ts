import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

function stripMd(s: string) {
  return (s || "").replace(/\*\*/g, "").trim();
}

function extractName(md: string) {
  const line = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("# "));
  return line ? stripMd(line.replace(/^#\s+/, "")) : "";
}

/**
 * Extrae la sección:
 * ## Datos de contacto
 * (líneas siguientes)
 * hasta el próximo "## "
 * y devuelve { contactLines, bodyMarkdownSinEsaSeccion }
 */
function extractContactSection(md: string) {
  const lines = md.split(/\r?\n/);
  let inContact = false;
  const contactLines: string[] = [];
  const bodyLines: string[] = [];

  for (const raw of lines) {
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
      if (t) contactLines.push(stripMd(t.replace(/^-+\s*/, ""))); // quita "- "
    } else {
      bodyLines.push(raw);
    }
  }

  return { contactLines, bodyMarkdown: bodyLines.join("\n") };
}

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

function normalizeContactLines(lines: string[]) {
  const clean = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^-+\s*/, ""));

  const phone = clean.find((l) => /celular|tel[eé]fono|phone/i.test(l));
  const email = clean.find((l) => /@/.test(l));
  const linkedin = clean.find((l) => /linkedin/i.test(l));
  const location = clean.find((l) =>
  /ciudad|ubicaci[oó]n|location|direcci[oó]n/i.test(l)
);


  const line1 = [phone, email].filter(Boolean).join(" | ");
  const line2 = [location, linkedin].filter(Boolean).join(" | ");

  const out: string[] = [];
  if (line1) out.push(line1);
  if (line2) out.push(line2);

  // fallback: 2 líneas máximo
  if (!out.length) return clean.slice(0, 2);

  return out;
}

function parseDataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  const base64 = match[2];
  return Buffer.from(base64, "base64");
}

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(next, size);
    if (width > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function POST(req: Request) {
  try {
    const { markdown, filename = "CV", photoDataUrl } = await req.json();

    if (!markdown) {
      return NextResponse.json({ ok: false, error: "missing_markdown" }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]); // Letter
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 48;
    const pageWidth = 612;
    const pageHeight = 792;
    const contentWidth = pageWidth - margin * 2;

    let y = pageHeight - margin;

    const name = extractName(markdown);
    const { contactLines, bodyMarkdown } = extractContactSection(markdown);
    const bodyNoName = removeTopNameHeading(bodyMarkdown);
    const contactNormalized = normalizeContactLines(contactLines);

    // --- Header layout ---
    const nameSize = 18;
    const contactSize = 11;

    const hasPhoto = !!photoDataUrl;
    const photoBox = hasPhoto ? { w: 90, h: 90 } : null;
    const photoX = hasPhoto ? pageWidth - margin - photoBox!.w : 0;
    const headerLeftMaxWidth = hasPhoto
      ? (photoX - margin - 12) // 12px gap
      : contentWidth;

    // Draw name (left)
    const safeName = stripMd(name || "Nombre y Apellido");
    const nameLines = wrapText(safeName, headerLeftMaxWidth, fontBold, nameSize);

    for (const line of nameLines) {
      page.drawText(line, { x: margin, y, size: nameSize, font: fontBold, color: rgb(0, 0, 0) });
      y -= nameSize + 4;
    }

    // Draw contact (left, 1–2 lines)
    for (const line of contactNormalized.slice(0, 2)) {
      const wrapped = wrapText(line, headerLeftMaxWidth, font, contactSize);
      for (const w of wrapped) {
        page.drawText(w, { x: margin, y, size: contactSize, font, color: rgb(0, 0, 0) });
        y -= contactSize + 3;
      }
    }

    // Draw photo (right) aligned to top of header block
    if (hasPhoto) {
      const bytes = parseDataUrlToBytes(photoDataUrl);
      if (bytes) {
        const mime = photoDataUrl.startsWith("data:image/png") ? "png" : "jpg";
        const img =
          mime === "png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

        // Keep square box, crop-ish fit by scaling
        const w = photoBox!.w;
        const h = photoBox!.h;
        const topY = pageHeight - margin; // align with top margin
        page.drawImage(img, {
          x: photoX,
          y: topY - h,
          width: w,
          height: h,
        });
      }
    }

   // --- Reserve header height to avoid text overlapping photo ---
const headerMinHeight = hasPhoto ? 110 : 60; // px aproximados
const headerBottomY = pageHeight - margin - headerMinHeight;

// Si el texto bajó menos que eso, forzamos el cursor
if (y > headerBottomY) {
  y = headerBottomY;
}

// Espacio extra antes del cuerpo
y -= 12;

    // --- Body renderer (ATS simple) ---
    const lines = bodyNoName.split(/\r?\n/);

    const newPage = () => {
      page = pdfDoc.addPage([612, 792]);
      y = pageHeight - margin;
    };

    const drawLine = (txt: string, bold = false, size = 11, indent = 0) => {
      const f = bold ? fontBold : font;
      page.drawText(txt, {
        x: margin + indent,
        y,
        size,
        font: f,
        color: rgb(0, 0, 0),
      });
      y -= size + 4;
      if (y < margin) newPage();
    };

    for (const raw of lines) {
      const t = raw.trim();
      if (!t) {
        y -= 6;
        if (y < margin) newPage();
        continue;
      }

      // Headings
      const h = t.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        const text = stripMd(h[2]);
        const size = level === 1 ? 16 : level === 2 ? 13 : 12;
        y -= 2;
        if (y < margin) newPage();
        drawLine(text, true, size, 0);
        continue;
      }

      // Bullets
      if (t.startsWith("- ")) {
        const text = stripMd(t.slice(2));
        const wrapped = wrapText(text, contentWidth - 12, font, 11);
        wrapped.forEach((w, i) => drawLine((i === 0 ? "• " : "  ") + w, false, 11, 0));
        continue;
      }

      // Normal paragraphs
      const text = stripMd(t);
      const wrapped = wrapText(text, contentWidth, font, 11);
      wrapped.forEach((w) => drawLine(w, false, 11, 0));
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (err) {
    console.error("pdf error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
