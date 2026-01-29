import type { DeviceOS } from "./device";

export type Offer = {
  id: string;
  name: string;
  url: string;
  allowed: DeviceOS[];
};

export const OFFERS: Offer[] = [
  {
    id: "mx_android",
    name: "MX Android",
    url: process.env.NEXT_PUBLIC_CPA_ANDROID_URL!,
    allowed: ["android"],
  },
  {
    id: "mx_ios",
    name: "MX iOS",
    url: process.env.NEXT_PUBLIC_CPA_IOS_URL!,
    allowed: ["ios"],
  },
  {
    id: "mx_desktop",
    name: "MX Desktop",
    url: process.env.NEXT_PUBLIC_CPA_DESKTOP_URL!,
    allowed: ["desktop"],
  },
];

