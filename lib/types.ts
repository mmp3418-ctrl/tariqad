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

/** Single-row public.home_content */
export interface HomeContent {
  id: number;
  hero_title: string | null;
  hero_subtitle: string | null;
  cta_button: string | null;
  about_text: string | null;
  updated_at: string;
}

/**
 * Row from public.subjects — course subject per stage/grade.
 * Live DB has BOTH:
 *   - canonical uuid: stage_id, grade_id
 *   - legacy text NOT NULL: stage, grade (same uuid strings)
 * App-facing `stage` / `grade` are those UUID strings after normalization.
 */
export interface Subject {
  /** uuid */
  id: string;
  name_ar: string;
  name_en: string | null;
  /** uuid string — academic_stages.id */
  stage: string;
  /** uuid string — academic_grades.id */
  grade: string;
  created_at?: string;
  updated_at?: string;
}

export type MaterialType =
  | "كتاب حصة"
  | "كتاب واجب"
  | "كراسة"
  | "قواعد"
  | "ورقة عمل"
  | "مفردات";

export interface AcademicStage {
  /** uuid */
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicGrade {
  /** uuid */
  id: string;
  /** uuid → academic_stages.id */
  stage_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicUnit {
  /** uuid */
  id: string;
  /** uuid → academic_grades.id */
  grade_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicTree {
  stages: AcademicStage[];
  grades: AcademicGrade[];
  units: AcademicUnit[];
}

export interface EducationalMaterial {
  /** uuid */
  id: string;
  title: string;
  unit_name: string;
  material_type: MaterialType;
  /** Canonical DB column — public Storage URL */
  file_url: string;
  /** uuid → academic_stages.id */
  stage_id: string | null;
  /** uuid → academic_grades.id */
  grade_id: string | null;
  /** uuid → public.subjects.id */
  subject_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface VideoPlaylist {
  /** uuid */
  id: string;
  title: string;
  /** Canonical DB column for the YouTube playlist link */
  playlist_url: string;
  unit_name: string;
  material_type: MaterialType;
  /** Optional cover image (Storage / external URL) */
  cover_image_url: string | null;
  /** uuid → academic_stages.id */
  stage_id: string | null;
  /** uuid → academic_grades.id */
  grade_id: string | null;
  /** uuid → public.subjects.id */
  subject_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** مساحة المعلم — شروحات المعلمين */
export interface TeacherTutorial {
  id: string;
  title: string;
  youtube_url: string;
  cover_image_url: string | null;
  stage_id: string | null;
  grade_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** مساحة المعلم — مرجع المعلمين */
export interface TeacherReference {
  /** uuid */
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  /** uuid → academic_stages.id (never send non-UUID text) */
  stage_id: string | null;
  /** uuid → academic_grades.id */
  grade_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type CorrectAnswerKey = "a" | "b" | "c" | "d";

/** مساحة المعلم — بنك الأسئلة */
export interface QuestionBankItem {
  id: string;
  question_text: string;
  /** Answer choices stored as a JSON array (preferred) */
  options: string[];
  /** Zero-based index into `options` */
  correct_index: number;
  stage_id: string | null;
  grade_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** Row from public.site_tool_settings (e.g. grade_calculator) */
export interface SiteToolSetting {
  id: string;
  tool_key: string;
  tool_name?: string | null;
  is_active: boolean;
  updated_at?: string;
}

/** Legacy single-row toggle kept in sync with site_tool_settings */
export interface TeacherSpaceSettings {
  id: number;
  grade_calculator_active: boolean;
  updated_at?: string;
}

/** Single-row global visibility for the public universal timetable */
export interface SiteTimetableStatus {
  /** Real DB primary key (uuid or legacy int) as string — never hardcode "1" for uuid cols */
  id: string;
  status_key: string;
  is_active: boolean;
  updated_at?: string;
}
