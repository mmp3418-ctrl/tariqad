import type { SettingsBundle, SiteSettings, SocialLink } from "@/lib/types";

const KEY = "tariq-site-settings-v3";

/** Empty shell only — no hardcoded contact/location/social values. */
export function defaultSettings(): SiteSettings {
  return {
    id: 1,
    email: null,
    location: null,
    whatsapp: null,
    telegram: null,
    google_maps_url: null,
    updated_at: new Date().toISOString(),
  };
}

export function defaultBundle(): SettingsBundle {
  return { settings: defaultSettings(), social_links: [] };
}

export function readLocalBundle(): SettingsBundle {
  if (typeof window === "undefined") return defaultBundle();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultBundle();
    const parsed = JSON.parse(raw) as Partial<SettingsBundle> &
      Partial<SiteSettings> & { social_links?: SocialLink[] };

    const settingsSource =
      parsed.settings && typeof parsed.settings === "object"
        ? parsed.settings
        : parsed;

    const settings: SiteSettings = {
      ...defaultSettings(),
      email: (settingsSource.email as string | null) ?? null,
      location: (settingsSource.location as string | null) ?? null,
      whatsapp: (settingsSource.whatsapp as string | null) ?? null,
      telegram: (settingsSource.telegram as string | null) ?? null,
      google_maps_url:
        (settingsSource.google_maps_url as string | null) ?? null,
      updated_at:
        (settingsSource.updated_at as string) ?? new Date().toISOString(),
    };

    const social_links = Array.isArray(parsed.social_links)
      ? parsed.social_links.map(normalizeLocalLink)
      : [];

    return { settings, social_links };
  } catch {
    return defaultBundle();
  }
}

function normalizeLocalLink(link: Partial<SocialLink>): SocialLink {
  return {
    id: String(link.id ?? crypto.randomUUID()),
    platform_name: String(link.platform_name ?? ""),
    url: String(link.url ?? ""),
    icon_name: (link.icon_name as SocialLink["icon_name"]) || "globe",
    is_active: link.is_active !== false,
    sort_order: Number(link.sort_order ?? 0),
    created_at: link.created_at,
    updated_at: link.updated_at,
  };
}

export function writeLocalBundle(bundle: SettingsBundle) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      settings: {
        ...bundle.settings,
        updated_at: new Date().toISOString(),
      },
      social_links: bundle.social_links,
    })
  );
}
