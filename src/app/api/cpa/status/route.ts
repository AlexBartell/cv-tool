import { NextResponse } from "next/server";
import { CPA_UNLOCKS } from "../_store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subid = searchParams.get("subid");

  if (!subid) return NextResponse.json({ unlocked: false }, { status: 200 });
  return NextResponse.json({ unlocked: CPA_UNLOCKS.has(subid) }, { status: 200 });
}
