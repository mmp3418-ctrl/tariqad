export type GradeStage = "primary" | "preparatory" | "secondary";
export type ResourceType = "pdf" | "playlist";
export type BadgeColor =
  | "teal"
  | "blue"
  | "amber"
  | "rose"
  | "violet"
  | "emerald"
  | "slate";
export type ResourceIconType =
  | "file-text"
  | "book-open"
  | "video"
  | "youtube"
  | "link"
  | "graduation-cap"
  | "notebook";
export type SocialIconKey =
  | "facebook"
  | "instagram"
  | "youtube"
  | "twitter"
  | "tiktok"
  | "linkedin"
  | "telegram"
  | "whatsapp"
  | "globe";

export interface Announcement {
  id: string;
  message_ar: string;
  message_en: string;
  is_active: boolean;
  created_at: string;
}

export interface Grade {
  id: string;
  stage: GradeStage;
  title_ar: string;
  title_en: string;
  slug: string;
  sort_order: number;
}

export interface Resource {
  id: string;
  grade_id: string;
  type: ResourceType;
  title_ar: string;
  title_en: string;
  subject_ar: string;
  subject_en: string;
  term: string | null;
  url: string;
  description_ar: string | null;
  description_en: string | null;
  badge_color: BadgeColor;
  icon_type: ResourceIconType;
}

export type ResourceWithGrade = Resource & {
  grades?: Pick<Grade, "id" | "title_ar" | "title_en" | "stage"> | null;
};

export interface TeacherSchedule {
  id: string;
  teacher_name: string;
  day_of_week: number;
  period_number: number;
  class_name: string;
  subject: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: SocialIconKey;
}

export interface SiteSettings {
  id: number;
  logo_url: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  telegram_link: string | null;
  social_links: SocialLink[];
  updated_at: string;
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };
