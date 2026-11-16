import type {
  AnnouncementKind,
  Grade,
  GradeStage,
  SocialIconKey,
} from "./types";

export const STAGE_LABELS: Record<GradeStage, string> = {
  primary: "ابتدائي",
  preparatory: "إعدادي",
  secondary: "ثانوي",
};

export const ANNOUNCEMENT_KIND_LABELS: Record<AnnouncementKind, string> = {
  alert: "تنبيه",
  update: "تحديث",
  important: "هام",
};

export const ANNOUNCEMENT_KIND_STYLES: Record<
  AnnouncementKind,
  { badge: string; bar: string; soft: string }
> = {
  alert: {
    badge: "bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
    soft: "from-amber-50 to-white border-amber-100",
  },
  update: {
    badge: "bg-sky-100 text-sky-800",
    bar: "bg-sky-500",
    soft: "from-sky-50 to-white border-sky-100",
  },
  important: {
    badge: "bg-rose-100 text-rose-800",
    bar: "bg-rose-500",
    soft: "from-rose-50 to-white border-rose-100",
  },
};

export const DAY_LABELS: Record<number, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export const WEEKDAYS = [0, 1, 2, 3, 4] as const;
export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const CARD_COLOR_PRESETS = [
  "#0f766e",
  "#2563eb",
  "#d97706",
  "#e11d48",
  "#7c3aed",
  "#059669",
  "#475569",
  "#0891b2",
  "#db2777",
  "#ca8a04",
] as const;

export const NOTE_ICON_OPTIONS = [
  "book-open",
  "file-text",
  "graduation-cap",
  "bookmark",
  "award",
  "notebook",
  "library",
  "scroll-text",
] as const;

export const VIDEO_ICON_OPTIONS = [
  "play-circle",
  "youtube",
  "video",
  "monitor-play",
  "tv",
  "clapperboard",
  "film",
  "radio",
] as const;

export const SOCIAL_ICON_OPTIONS: {
  value: SocialIconKey;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X / Twitter" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "snapchat", label: "Snapchat" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "globe", label: "موقع / أخرى" },
];

export const NAV_ITEMS = [
  { href: "/announcements", label: "الإعلانات", icon: "Megaphone" },
  { href: "/grades", label: "الصفوف الدراسية", icon: "GraduationCap" },
  { href: "/notes", label: "المذكرات والملخصات", icon: "FileText" },
  { href: "/videos", label: "الشروحات المرئية", icon: "PlayCircle" },
  { href: "/schedules", label: "جداول المعلمين", icon: "CalendarDays" },
  { href: "/users", label: "المشرفون والصلاحيات", icon: "Users" },
  { href: "/settings", label: "إعدادات الموقع", icon: "Settings" },
] as const;

export const LIBYAN_GRADES_SEED: Omit<Grade, "id">[] = [
  { stage: "primary", title_ar: "الصف الأول الابتدائي", title_en: "Grade 1 Primary", slug: "primary-1", sort_order: 1 },
  { stage: "primary", title_ar: "الصف الثاني الابتدائي", title_en: "Grade 2 Primary", slug: "primary-2", sort_order: 2 },
  { stage: "primary", title_ar: "الصف الثالث الابتدائي", title_en: "Grade 3 Primary", slug: "primary-3", sort_order: 3 },
  { stage: "primary", title_ar: "الصف الرابع الابتدائي", title_en: "Grade 4 Primary", slug: "primary-4", sort_order: 4 },
  { stage: "primary", title_ar: "الصف الخامس الابتدائي", title_en: "Grade 5 Primary", slug: "primary-5", sort_order: 5 },
  { stage: "primary", title_ar: "الصف السادس الابتدائي", title_en: "Grade 6 Primary", slug: "primary-6", sort_order: 6 },
  { stage: "preparatory", title_ar: "الصف السابع الإعدادي", title_en: "Grade 7 Preparatory", slug: "preparatory-7", sort_order: 7 },
  { stage: "preparatory", title_ar: "الصف الثامن الإعدادي", title_en: "Grade 8 Preparatory", slug: "preparatory-8", sort_order: 8 },
  { stage: "preparatory", title_ar: "الصف التاسع الإعدادي", title_en: "Grade 9 Preparatory", slug: "preparatory-9", sort_order: 9 },
  { stage: "secondary", title_ar: "السنة الأولى ثانوي", title_en: "Secondary Year 1", slug: "secondary-1", sort_order: 10 },
  { stage: "secondary", title_ar: "السنة الثانية ثانوي", title_en: "Secondary Year 2", slug: "secondary-2", sort_order: 11 },
  { stage: "secondary", title_ar: "السنة الثالثة ثانوي", title_en: "Secondary Year 3", slug: "secondary-3", sort_order: 12 },
];

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `grade-${Date.now()}`;
}
