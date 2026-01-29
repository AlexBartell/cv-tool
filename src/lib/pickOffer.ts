import type { DeviceOS } from "./device";
import { OFFERS, type Offer } from "./cpaOffers";

function weightedPick(items: Offer[]): Offer | null {
  if (items.length === 0) return null;
  const expanded: Offer[] = [];
  for (const it of items) {
    const w = Math.max(1, it.weight ?? 1);
    for (let i = 0; i < w; i++) expanded.push(it);
  }
  return expanded[Math.floor(Math.random() * expanded.length)] ?? null;
}

export function pickOffer(os: DeviceOS): Offer | null {
  const candidates = OFFERS.filter((o) => o.allowed.includes(os));
  if (candidates.length) return weightedPick(candidates);

  const fallback = OFFERS.filter((o) => o.allowed.includes("desktop") || o.allowed.includes("ios"));
  return weightedPick(fallback);
}
