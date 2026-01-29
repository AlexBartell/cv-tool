import { redis } from "@/lib/redis";

export async function rateLimit({
  key,
  limit,
  ttlSeconds,
}: {
  key: string;
  limit: number;
  ttlSeconds: number;
}) {
  const lua = `
    local v = redis.call("INCR", KEYS[1])
    if v == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return v
  `;
  const n = await redis.eval(lua, 1, key, String(ttlSeconds));
  const count = typeof n === "number" ? n : Number(n);
  return { ok: count <= limit, count };
}
