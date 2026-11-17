export type GradeStage = "primary" | "preparatory" | "secondary";
export type ResourceType = "pdf" | "video";
export type AdminRole = "admin" | "helper";
export type AnnouncementKind = "alert" | "update" | "important";

export type ResourceCategory =
  | "classbook"
  | "workbook"
  | "vocabulary"
  | "grammar"
  | "questions";

export type TeacherSpaceCategory =
  | "lesson_prep"
  | "worksheets"
  | "question_banks"
  | "grammar_summaries"
  | "classroom_guide";

/** PDF books page — student vs teacher audience */
export type TargetAudience = "student" | "teacher";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export interface QuestionData {
  question_text: string;
  options: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
  difficulty: QuestionDifficulty;
}

/** Combined category values stored in resources.resource_category */
export type PdfBookCategory = ResourceCategory | TeacherSpaceCategory;

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
  | "globe";

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  role: AdminRole;
  created_at: string;
}

export type AdminUserPublic = Omit<AdminUser, "password">;

export interface Announcement {
  id: string;
  message_ar: string;
  message_en: string;
  is_active: boolean;
  kind: AnnouncementKind;
  created_at: string;
}

export interface Grade {
  id: string;
  stage: GradeStage;
  title_ar: string;
  title_en: string;
  slug: string;
  sort_order: number;
  is_coming_soon: boolean;
}

export interface Unit {
  id: string;
  grade_id: string;
  title_ar: string;
  title_en: string;
  sort_order: number;
  is_coming_soon: boolean;
}

export interface Lesson {
  id: string;
  unit_id: string;
  title_ar: string;
  title_en: string;
  sort_order: number;
  is_coming_soon: boolean;
}

export type UnitWithLessons = Unit & { lessons?: Lesson[] };

export interface Resource {
  id: string;
  grade_id: string;
  unit_id: string | null;
  lesson_id: string | null;
  type: ResourceType;
  title_ar: string;
  title_en: string;
  subject_ar: string;
  subject_en: string;
  term: string | null;
  url: string;
  description_ar: string | null;
  description_en: string | null;
  badge_color: string;
  icon_type: string;
  cover_image_url: string | null;
  resource_category: ResourceCategory | PdfBookCategory | null;
  target_audience: TargetAudience | null;
  question_data: QuestionData | null;
  is_coming_soon: boolean;
}

export type ResourceWithGrade = Resource & {
  grades?: Pick<Grade, "id" | "title_ar" | "title_en" | "stage"> | null;
  units?: Pick<Unit, "id" | "title_ar"> | null;
  lessons?: Pick<Lesson, "id" | "title_ar"> | null;
};

/** Alias used by the PDF books manager */
export type PdfBook = ResourceWithGrade;

/** General school period timetable (`class_schedules`) */
export interface ClassSchedule {
  id: string;
  class_name: string;
  day_of_week: number;
  period_number: number;
  subject: string;
  room: string | null;
  is_active: boolean;
}

/** Per-teacher timetable slots (`teacher_schedules`) */
export interface TeacherSchedule {
  id: string;
  teacher_name: string;
  day_of_week: number;
  period_number: number;
  class_name: string;
  subject: string;
  is_active: boolean;
}

/** Grade calculator tool / config (`grade_calculator_tools`) */
export interface GradeCalculatorTool {
  id: string;
  title_ar: string;
  description_ar: string | null;
  url: string;
  grade_id: string | null;
  unit_id: string | null;
  max_score: number;
  is_active: boolean;
  is_coming_soon: boolean;
  created_at: string;
  grades?: Pick<Grade, "id" | "title_ar"> | null;
  units?: Pick<Unit, "id" | "title_ar"> | null;
}

/** Student grade record per class/unit (`grade_records`) */
export interface GradeRecord {
  id: string;
  student_name: string;
  grade_id: string;
  unit_id: string;
  score: number;
  max_score: number;
  notes: string | null;
  created_at: string;
  grades?: Pick<Grade, "id" | "title_ar"> | null;
  units?: Pick<Unit, "id" | "title_ar"> | null;
}

/** Stored in `teacher_resources` table — preset tools only */
export interface TeacherSpaceItem {
  id: string;
  category: TeacherSpaceCategory;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  url: string;
  grade_id: string | null;
  unit_id: string | null;
  is_active: boolean;
  is_coming_soon: boolean;
  sort_order: number;
  created_at: string;
  grades?: Pick<Grade, "id" | "title_ar"> | null;
  units?: Pick<Unit, "id" | "title_ar"> | null;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: SocialIconKey;
  custom_icon_url?: string | null;
}

export interface SiteSettings {
  id: number;
  logo_url: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  telegram_link: string | null;
  social_links: SocialLink[];
  hero_subtitle_ar: string | null;
  hero_subtitle_en: string | null;
  book_year_label: string | null;
  /** Public feature flags for student platform */
  schedules_enabled: boolean;
  grade_calculator_enabled: boolean;
  admin_password?: string | null;
  updated_at: string;
}

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export type SessionUser = {
  username: string;
  role: AdminRole;
};
