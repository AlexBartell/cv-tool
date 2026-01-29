// /lib/device.ts
export type DeviceOS = "android" | "ios" | "desktop" | "unknown";

export function detectOS(): DeviceOS {
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent || "";
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";

  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    // iPadOS 13+ sometimes reports as Mac but has touch points
    (platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);

  if (isAndroid) return "android";
  if (isIOS) return "ios";

  // Si no es mobile OS, lo tratamos como desktop
  if (/Windows|Mac|Linux/i.test(platform) || /Windows|Macintosh|X11|Linux/i.test(ua)) {
    return "desktop";
  }
  return "unknown";
}
