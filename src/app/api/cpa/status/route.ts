import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tracking_id = (searchParams.get("tracking_id") ?? "").trim();

  if (!tracking_id) return NextResponse.json({ unlocked: false }, { status: 200 });

  const val = await redis.get(`cpa:unlock:${tracking_id}`);
  return NextResponse.json({ unlocked: val === "1" }, { status: 200 });
}
