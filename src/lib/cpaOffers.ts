import type { DeviceOS } from "./device";

export type Offer = {
  id: string;
  name: string;
  url: string;
  allowed: DeviceOS[];
  weight?: number;
};

export const OFFERS: Offer[] = [
  {
    id: "mx_desktop_ios_69536",
    name: "MX Desktop + iOS",
    url: "https://singingfiles.com/show.php?l=0&u=2493983&id=69536",
    allowed: ["desktop", "ios"],
    weight: 10,
  },
  {
    id: "mx_android_66422",
    name: "MX Android",
    url: "https://singingfiles.com/show.php?l=0&u=2493983&id=66422",
    allowed: ["android"],
    weight: 10,
  },
];
