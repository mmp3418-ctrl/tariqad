import type {
  BadgeColor,
  Grade,
  GradeStage,
  ResourceIconType,
  SocialIconKey,
} from "./types";

export const STAGE_LABELS: Record<GradeStage, string> = {
  primary: "الابتدائية",
  preparatory: "الإعدادية",
  secondary: "الثانوية",
};

export const BADGE_COLOR_OPTIONS: {
  value: BadgeColor;
  label: string;
  swatch: string;
}[] = [
  { value: "teal", label: "فيروزي", swatch: "#0f766e" },
  { value: "blue", label: "أزرق", swatch: "#2563eb" },
  { value: "amber", label: "عنبري", swatch: "#d97706" },
  { value: "rose", label: "وردي", swatch: "#e11d48" },
  { value: "violet", label: "بنفسجي", swatch: "#7c3aed" },
  { value: "emerald", label: "زمردي", swatch: "#059669" },
  { value: "slate", label: "رمادي", swatch: "#475569" },
];

export const RESOURCE_ICON_OPTIONS: {
  value: ResourceIconType;
  label: string;
}[] = [
  { value: "file-text", label: "ملف" },
  { value: "book-open", label: "كتاب" },
  { value: "video", label: "فيديو" },
  { value: "youtube", label: "يوتيوب" },
  { value: "link", label: "رابط" },
  { value: "graduation-cap", label: "تخرج" },
  { value: "notebook", label: "دفتر" },
];

export const SOCIAL_ICON_OPTIONS: {
  value: SocialIconKey;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter / X" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "globe", label: "موقع / أخرى" },
];

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

export const RESOURCE_TYPE_LABELS: Record<"pdf" | "playlist", string> = {
  pdf: "ملف PDF",
  playlist: "قائمة تشغيل",
};

export const NAV_ITEMS = [
  {
    href: "/announcements",
    label: "الإعلانات",
    icon: "Megaphone",
  },
  {
    href: "/grades",
    label: "الصفوف الدراسية",
    icon: "GraduationCap",
  },
  {
    href: "/resources",
    label: "المذكرات والشروحات",
    icon: "BookOpen",
  },
  {
    href: "/schedules",
    label: "جداول المعلمين",
    icon: "CalendarDays",
  },
  {
    href: "/settings",
    label: "إعدادات الموقع الهوية والتواصل",
    icon: "Settings",
  },
] as const;

/** Default Libyan curriculum grades (primary 1–6, preparatory 7–9, secondary 1–3). */
export const LIBYAN_GRADES_SEED: Omit<Grade, "id">[] = [
  {
    stage: "primary",
    title_ar: "الصف الأول الابتدائي",
    title_en: "Grade 1 Primary",
    slug: "primary-1",
    sort_order: 1,
  },
  {
    stage: "primary",
    title_ar: "الصف الثاني الابتدائي",
    title_en: "Grade 2 Primary",
    slug: "primary-2",
    sort_order: 2,
  },
  {
    stage: "primary",
    title_ar: "الصف الثالث الابتدائي",
    title_en: "Grade 3 Primary",
    slug: "primary-3",
    sort_order: 3,
  },
  {
    stage: "primary",
    title_ar: "الصف الرابع الابتدائي",
    title_en: "Grade 4 Primary",
    slug: "primary-4",
    sort_order: 4,
  },
  {
    stage: "primary",
    title_ar: "الصف الخامس الابتدائي",
    title_en: "Grade 5 Primary",
    slug: "primary-5",
    sort_order: 5,
  },
  {
    stage: "primary",
    title_ar: "الصف السادس الابتدائي",
    title_en: "Grade 6 Primary",
    slug: "primary-6",
    sort_order: 6,
  },
  {
    stage: "preparatory",
    title_ar: "الصف السابع الإعدادي",
    title_en: "Grade 7 Preparatory",
    slug: "preparatory-7",
    sort_order: 7,
  },
  {
    stage: "preparatory",
    title_ar: "الصف الثامن الإعدادي",
    title_en: "Grade 8 Preparatory",
    slug: "preparatory-8",
    sort_order: 8,
  },
  {
    stage: "preparatory",
    title_ar: "الصف التاسع الإعدادي",
    title_en: "Grade 9 Preparatory",
    slug: "preparatory-9",
    sort_order: 9,
  },
  {
    stage: "secondary",
    title_ar: "السنة الأولى ثانوي",
    title_en: "Secondary Year 1",
    slug: "secondary-1",
    sort_order: 10,
  },
  {
    stage: "secondary",
    title_ar: "السنة الثانية ثانوي",
    title_en: "Secondary Year 2",
    slug: "secondary-2",
    sort_order: 11,
  },
  {
    stage: "secondary",
    title_ar: "السنة الثالثة ثانوي",
    title_en: "Secondary Year 3",
    slug: "secondary-3",
    sort_order: 12,
  },
];

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
