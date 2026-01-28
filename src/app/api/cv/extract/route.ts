import { NextResponse } from "next/server";
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs"; // Buffer OK

function getExt(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
    }

    const filename = file.name || "upload";
    const ext = getExt(filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (ext === "pdf") {
      // pdf-parse en ESM/CJS: la función suele estar en .default
      const fn = (pdfParse as any).default ?? (pdfParse as any);
      const data = await fn(buffer);
      text = data?.text || "";
    } else if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (ext === "txt") {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { ok: false, error: "unsupported_file_type", supported: ["pdf", "docx", "txt"] },
        { status: 400 }
      );
    }

    text = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: "no_text_extracted",
          hint: "Si el PDF es escaneado (imagen), no se puede extraer texto sin OCR.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, text });
  } catch (err: any) {
    console.error("extract error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
