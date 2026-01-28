export const gaEvent = (eventName: string, params: Record<string, any> = {}) => {
  if (typeof window === "undefined") return;
  // @ts-ignore
  if (!window.gtag) return;

  // @ts-ignore
  window.gtag("event", eventName, params);
};
