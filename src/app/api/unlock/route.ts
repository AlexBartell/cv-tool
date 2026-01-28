import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getValidCodes(): Set<string> {
  const raw = process.env.UNLOCK_CODES || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
    }

    const valid = getValidCodes();
    const normalized = code.trim();

    if (!valid.has(normalized)) {
      return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
