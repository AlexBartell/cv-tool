import type { DeviceOS } from "./device";
import { OFFERS, type Offer } from "./cpaOffers";

export function pickOffer(os: DeviceOS): Offer | null {
  const candidates = OFFERS.filter((o) => o.allowed.includes(os));
  if (candidates.length) return candidates[0];

  // fallback de seguridad
  const fallback = OFFERS.filter(
    (o) => o.allowed.includes("desktop") || o.allowed.includes("ios")
  );
  return fallback[0] ?? null;
}
