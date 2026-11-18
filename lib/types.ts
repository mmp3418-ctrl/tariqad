export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export type SocialIconKey =
  | "facebook"
  | "instagram"
  | "youtube"
  | "twitter"
  | "tiktok"
  | "linkedin"
  | "snapchat"
  | "telegram"
  | "whatsapp"
  | "phone"
  | "globe";

/** Row from public.social_links */
export interface SocialLink {
  id: string;
  platform_name: string;
  url: string;
  icon_name: SocialIconKey;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** Single-row public.site_settings */
export interface SiteSettings {
  id: number;
  email: string | null;
  location: string | null;
  whatsapp: string | null;
  telegram: string | null;
  google_maps_url: string | null;
  updated_at: string;
}

export interface SettingsBundle {
  settings: SiteSettings;
  social_links: SocialLink[];
}
