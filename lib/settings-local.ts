import type { SiteSettings, SocialLink } from "@/lib/types";

const KEY = "tariq-site-settings-v2";

/** Empty shell only — no hardcoded contact/location/social values. */
export function defaultSettings(): SiteSettings {
  return {
    id: 1,
    phone_number: null,
    whatsapp_number: null,
    telegram_link: null,
    email: null,
    location_text: null,
    maps_url: null,
    social_links: [],
    hero_subtitle_ar: null,
    book_year_label: null,
    updated_at: new Date().toISOString(),
  };
}

export function readLocalSettings(): SiteSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return {
      ...defaultSettings(),
      ...parsed,
      id: 1,
      social_links: Array.isArray(parsed.social_links)
        ? (parsed.social_links as SocialLink[])
        : [],
    };
  } catch {
    return defaultSettings();
  }
}

export function writeLocalSettings(settings: SiteSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...settings, updated_at: new Date().toISOString() })
  );
}
