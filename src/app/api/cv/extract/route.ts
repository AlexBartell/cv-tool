import { NextResponse } from "next/server";
import mammoth from "mammoth";

export const runtime = "nodejs";

function getExt(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export async function GET(req: Request) {
  // ✅ Para que si el browser hace GET (o alguien abre la URL) no veas 405 ni rompa JSON
  return NextResponse.json(
    {
      ok: false,
      error: "method_not_allowed",
      hint: "Use POST multipart/form-data with field 'file'.",
      method: req.method,
    },
    { status: 405 }
  );
}

export async function POST(req: Request) {
  try {
    // Debug mínimo del método
    // console.log("EXTRACT method:", req.method);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "missing_file", keys: Array.from(formData.keys()) },
        { status: 400 }
      );
    }

    const filename = file.name || "upload";
    let ext = getExt(filename);

    // fallback por MIME si no hay extensión
    if (!ext) {
      if (file.type.includes("pdf")) ext = "pdf";
      else if (file.type.includes("wordprocessingml")) ext = "docx";
      else if (file.type.includes("text")) ext = "txt";
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (ext === "pdf") {
      // ✅ import dinámico (evita bundling issues en Vercel)
      const pdfParseMod: any = await import("pdf-parse");
      const pdfParseFn = pdfParseMod.default ?? pdfParseMod;

      const data = await pdfParseFn(buffer);
      text = data?.text || "";
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (ext === "txt") {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "unsupported_file_type",
          supported: ["pdf", "docx", "txt"],
          filename,
          mime: file.type,
        },
        { status: 400 }
      );
    }

    text = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_text_extracted",
          filename,
          mime: file.type,
          hint:
            "Si el PDF es escaneado (imagen) no se puede extraer texto sin OCR.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    console.error("extract error:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
