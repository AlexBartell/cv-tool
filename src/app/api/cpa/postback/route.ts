import { NextResponse } from "next/server";
import { CPA_UNLOCKS } from "../_store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subid = searchParams.get("subid") || searchParams.get("sub_id") || searchParams.get("clickid");

  if (!subid) return NextResponse.json({ ok: false, error: "missing subid" }, { status: 400 });

  // acá podrías validar un token/secret si CPAGrip te permite
  CPA_UNLOCKS.add(subid);

  return NextResponse.json({ ok: true });
}
