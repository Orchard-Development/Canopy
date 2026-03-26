declare const __BRAND_NAME__: string;
declare const __BRAND_SUBTITLE__: string;

export const BASE = {
  name: typeof __BRAND_NAME__ !== "undefined" ? __BRAND_NAME__ : "Orchard",
  subtitle: typeof __BRAND_SUBTITLE__ !== "undefined" ? __BRAND_SUBTITLE__ : "Command Center",
};
