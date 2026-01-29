// /lib/pickOffer.ts
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
  const candidates = OFFERS.filter(o => o.allowed.includes(os));
  // fallback: si no hay, probá "desktop" como comodín
  if (candidates.length === 0 && os !== "desktop") {
    const desktopCandidates = OFFERS.filter(o => o.allowed.includes("desktop"));
    return weightedPick(desktopCandidates);
  }
  return weightedPick(candidates);
}
