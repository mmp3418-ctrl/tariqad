import type { SiteSettings, SocialLink } from "@/lib/types";

const KEY = "tariq-site-settings-v1";

export function defaultSettings(): SiteSettings {
  return {
    id: 1,
    phone_number: null,
    whatsapp_number: null,
    telegram_link: null,
    social_links: [],
    hero_subtitle_ar: "منصتك التعليمية الشاملة للمنهج الليبي",
    book_year_label: "2026 - 2027",
    updated_at: new Date().toISOString(),
  };
}

export function readLocalSettings(): SiteSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as SiteSettings;
    return {
      ...defaultSettings(),
      ...parsed,
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
