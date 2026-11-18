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

export interface SocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: SocialIconKey;
  is_visible: boolean;
}

export interface SiteSettings {
  id: number;
  phone_number: string | null;
  whatsapp_number: string | null;
  telegram_link: string | null;
  social_links: SocialLink[];
  hero_subtitle_ar: string | null;
  book_year_label: string | null;
  updated_at: string;
}
