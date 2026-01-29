import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);

  const tracking_id = (form?.get("tracking_id")?.toString() ?? "").trim();
  const offer_id = (form?.get("offer_id")?.toString() ?? "").trim();
  const payout = (form?.get("payout")?.toString() ?? "").trim();
  const password = (form?.get("password")?.toString() ?? "").trim();

  if (!tracking_id) {
    return NextResponse.json({ ok: false, error: "missing tracking_id" }, { status: 400 });
  }

  const expected = (process.env.CPAGRIP_POSTBACK_PASSWORD ?? "").trim();
  if (expected && password !== expected) {
    return NextResponse.json({ ok: false, error: "bad password" }, { status: 403 });
  }

  // unlock 48h
  await redis.set(`cpa:unlock:${tracking_id}`, "1", "EX", 60 * 60 * 48);

  // metadata opcional
  if (offer_id) await redis.set(`cpa:meta:${tracking_id}:offer_id`, offer_id, "EX", 60 * 60 * 48);
  if (payout) await redis.set(`cpa:meta:${tracking_id}:payout`, payout, "EX", 60 * 60 * 48);

  return NextResponse.json({ ok: true });
}
