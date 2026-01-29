// /lib/cpaOffers.ts
import type { DeviceOS } from "./device";

export type Offer = {
  id: string;              // tu id interno
  network: "cpagrip";
  name: string;
  url: string;             // tu smartlink o enlace de oferta
  allowed: DeviceOS[];     // plataformas compatibles
  weight?: number;         // para rotación
};

export const OFFERS: Offer[] = [
  {
    id: "and_1",
    network: "cpagrip",
    name: "Android Offer A",
    url: "https://TU_LINK_ANDROID",
    allowed: ["android"],
    weight: 3,
  },
  {
    id: "ios_1",
    network: "cpagrip",
    name: "iOS Offer A",
    url: "https://TU_LINK_IOS",
    allowed: ["ios"],
    weight: 3,
  },
  {
    id: "desk_1",
    network: "cpagrip",
    name: "Desktop Offer A",
    url: "https://TU_LINK_DESKTOP",
    allowed: ["desktop"],
    weight: 2,
  },
  {
    id: "desk_ios_1",
    network: "cpagrip",
    name: "Desktop + iOS Offer",
    url: "https://TU_LINK_DESKTOP_IOS",
    allowed: ["desktop", "ios"],
    weight: 1,
  },
];
