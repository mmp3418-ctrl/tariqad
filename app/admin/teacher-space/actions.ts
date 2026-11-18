"use server";

import { revalidatePath } from "next/cache";
import { isValidYoutubeUrl } from "@/lib/academic";
import { supabase } from "@/lib/supabase";
import type {
  ActionResult,
  QuestionBankItem,
  TeacherReference,
  TeacherSpaceSettings,
  TeacherTimetable,
  TeacherTutorial,
} from "@/lib/types";

const REVALIDATE = "/admin/teacher-space";

function asBool(v: unknown) {
  return v !== false;
}

const LETTERS = ["a", "b", "c", "d"] as const;

function asOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? ""));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? ""));
    } catch {
      return [];
    }
  }
  return [];
}

function letterIndex(value: unknown): number {
  const index = LETTERS.indexOf(String(value ?? "a").toLowerCase() as (typeof LETTERS)[number]);
  return index >= 0 ? index : 0;
}

function normalizeTimetable(row: Record<string, unknown>): TeacherTimetable {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    file_url: String(row.file_url ?? "").trim(),
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: asBool(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function normalizeTutorial(row: Record<string, unknown>): TeacherTutorial {
  const cover = String(row.cover_image_url ?? "").trim();
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    youtube_url: String(row.youtube_url ?? "").trim(),
    cover_image_url: cover || null,
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: asBool(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function normalizeReference(row: Record<string, unknown>): TeacherReference {
  const description = String(row.description ?? "").trim();
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: description || null,
    file_url: String(row.file_url ?? "").trim(),
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: asBool(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function normalizeQuestion(row: Record<string, unknown>): QuestionBankItem {
  let options = asOptions(row.options).map((item) => item.trim());
  const blank = options.length === 0 || options.every((item) => !item);
  let correct_index = Number(row.correct_index ?? NaN);

  if (blank && (row.option_a != null || row.option_b != null)) {
    options = ["option_a", "option_b", "option_c", "option_d"]
      .map((key) => String(row[key] ?? "").trim())
      .filter((item, index, list) => {
        if (item && item !== "—") return true;
        return list.slice(index + 1).some((next) => next && next !== "—");
      });
    correct_index = letterIndex(row.correct_answer);
  }

  if (!Number.isFinite(correct_index) || correct_index < 0) correct_index = 0;
  if (options.length && correct_index >= options.length) {
    correct_index = options.length - 1;
  }

  return {
    id: String(row.id),
    question_text: String(row.question_text ?? ""),
    options,
    correct_index,
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: asBool(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function nextSort(table: string) {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

// —— Timetables ——

export async function getTimetables(): Promise<ActionResult<TeacherTimetable[]>> {
  try {
    const { data, error } = await supabase
      .from("teacher_timetables")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((r) => normalizeTimetable(r as Record<string, unknown>)),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type TimetableInput = {
  title: string;
  file_url: string;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

export async function createTimetable(
  input: TimetableInput
): Promise<ActionResult<TeacherTimetable>> {
  try {
    if (!input.title.trim()) return { success: false, error: "العنوان مطلوب" };
    if (!input.file_url.trim()) return { success: false, error: "يجب رفع ملف PDF" };
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const { data, error } = await supabase
      .from("teacher_timetables")
      .insert({
        title: input.title.trim(),
        file_url: input.file_url.trim(),
        stage_id: input.stage_id,
        grade_id: input.grade_id,
        is_active: input.is_active !== false,
        sort_order: await nextSort("teacher_timetables"),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeTimetable(data as Record<string, unknown>),
      message: "تمت إضافة الجدول",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTimetable(
  id: string,
  input: TimetableInput
): Promise<ActionResult<TeacherTimetable>> {
  try {
    if (!id) return { success: false, error: "معرّف غير صالح" };
    if (!input.title.trim()) return { success: false, error: "العنوان مطلوب" };
    if (!input.file_url.trim()) return { success: false, error: "يجب رفع ملف PDF" };
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const { data, error } = await supabase
      .from("teacher_timetables")
      .update({
        title: input.title.trim(),
        file_url: input.file_url.trim(),
        stage_id: input.stage_id,
        grade_id: input.grade_id,
        is_active: input.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeTimetable(data as Record<string, unknown>),
      message: "تم تحديث الجدول",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleTimetableActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<TeacherTimetable>> {
  try {
    const { data, error } = await supabase
      .from("teacher_timetables")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeTimetable(data as Record<string, unknown>),
      message: is_active ? "تم التفعيل" : "تم الإيقاف",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteTimetable(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase.from("teacher_timetables").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return { success: true, message: "تم الحذف" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// —— Tutorials ——

export async function getTutorials(): Promise<ActionResult<TeacherTutorial[]>> {
  try {
    const { data, error } = await supabase
      .from("teacher_tutorials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((r) => normalizeTutorial(r as Record<string, unknown>)),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type TutorialInput = {
  title: string;
  youtube_url: string;
  cover_image_url?: string | null;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

export async function createTutorial(
  input: TutorialInput
): Promise<ActionResult<TeacherTutorial>> {
  try {
    if (!input.title.trim()) return { success: false, error: "العنوان مطلوب" };
    if (!input.youtube_url.trim()) return { success: false, error: "رابط يوتيوب مطلوب" };
    if (!isValidYoutubeUrl(input.youtube_url)) {
      return { success: false, error: "رابط يوتيوب غير صالح" };
    }
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const cover = String(input.cover_image_url ?? "").trim();
    const { data, error } = await supabase
      .from("teacher_tutorials")
      .insert({
        title: input.title.trim(),
        youtube_url: input.youtube_url.trim(),
        cover_image_url: cover || null,
        stage_id: input.stage_id,
        grade_id: input.grade_id,
        is_active: input.is_active !== false,
        sort_order: await nextSort("teacher_tutorials"),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeTutorial(data as Record<string, unknown>),
      message: "تمت إضافة الشرح",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateTutorial(
  id: string,
  input: TutorialInput
): Promise<ActionResult<TeacherTutorial>> {
  try {
    if (!id) return { success: false, error: "معرّف غير صالح" };
    if (!input.title.trim()) return { success: false, error: "العنوان مطلوب" };
    if (!input.youtube_url.trim()) return { success: false, error: "رابط يوتيوب مطلوب" };
    if (!isValidYoutubeUrl(input.youtube_url)) {
      return { success: false, error: "رابط يوتيوب غير صالح" };
    }
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const cover = String(input.cover_image_url ?? "").trim();
    const { data, error } = await supabase
      .from("teacher_tutorials")
      .update({
        title: input.title.trim(),
        youtube_url: input.youtube_url.trim(),
        cover_image_url: cover || null,
        stage_id: input.stage_id,
        grade_id: input.grade_id,
        is_active: input.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeTutorial(data as Record<string, unknown>),
      message: "تم تحديث الشرح",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleTutorialActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<TeacherTutorial>> {
  try {
    const { data, error } = await supabase
      .from("teacher_tutorials")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeTutorial(data as Record<string, unknown>),
      message: is_active ? "تم التفعيل" : "تم الإيقاف",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteTutorial(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase.from("teacher_tutorials").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return { success: true, message: "تم الحذف" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// —— References ——

export async function getReferences(): Promise<ActionResult<TeacherReference[]>> {
  try {
    const { data, error } = await supabase
      .from("teacher_references")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((r) => normalizeReference(r as Record<string, unknown>)),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type ReferenceInput = {
  title: string;
  description?: string | null;
  file_url: string;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

export async function createReference(
  input: ReferenceInput
): Promise<ActionResult<TeacherReference>> {
  try {
    if (!input.title.trim()) return { success: false, error: "العنوان مطلوب" };
    if (!input.file_url.trim()) return { success: false, error: "يجب رفع ملف PDF" };
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const description = String(input.description ?? "").trim();
    const { data, error } = await supabase
      .from("teacher_references")
      .insert({
        title: input.title.trim(),
        description: description || null,
        file_url: input.file_url.trim(),
        stage_id: input.stage_id,
        grade_id: input.grade_id,
        is_active: input.is_active !== false,
        sort_order: await nextSort("teacher_references"),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeReference(data as Record<string, unknown>),
      message: "تمت إضافة المرجع",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateReference(
  id: string,
  input: ReferenceInput
): Promise<ActionResult<TeacherReference>> {
  try {
    if (!id) return { success: false, error: "معرّف غير صالح" };
    if (!input.title.trim()) return { success: false, error: "العنوان مطلوب" };
    if (!input.file_url.trim()) return { success: false, error: "يجب رفع ملف PDF" };
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const description = String(input.description ?? "").trim();
    const { data, error } = await supabase
      .from("teacher_references")
      .update({
        title: input.title.trim(),
        description: description || null,
        file_url: input.file_url.trim(),
        stage_id: input.stage_id,
        grade_id: input.grade_id,
        is_active: input.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeReference(data as Record<string, unknown>),
      message: "تم تحديث المرجع",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleReferenceActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<TeacherReference>> {
  try {
    const { data, error } = await supabase
      .from("teacher_references")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeReference(data as Record<string, unknown>),
      message: is_active ? "تم التفعيل" : "تم الإيقاف",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteReference(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase.from("teacher_references").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return { success: true, message: "تم الحذف" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// —— Question bank ——

export async function getQuestions(): Promise<ActionResult<QuestionBankItem[]>> {
  try {
    const { data, error } = await supabase
      .from("question_bank")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((r) => normalizeQuestion(r as Record<string, unknown>)),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type QuestionInput = {
  question_text: string;
  options: string[];
  correct_index: number;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

function questionColumns(input: QuestionInput) {
  const trimmed = input.options.map((item) => item.trim());
  while (trimmed.length && !trimmed[trimmed.length - 1]) trimmed.pop();
  const padded = [...trimmed];
  while (padded.length < 4) padded.push("—");
  const correct_index = Math.min(
    Math.max(input.correct_index, 0),
    Math.max(trimmed.length - 1, 0)
  );
  return {
    question_text: input.question_text.trim(),
    options: trimmed,
    correct_index,
    option_a: padded[0],
    option_b: padded[1],
    option_c: padded[2],
    option_d: padded[3],
    correct_answer: LETTERS[Math.min(correct_index, 3)],
    stage_id: input.stage_id,
    grade_id: input.grade_id,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function writeQuestion(
  mode: "insert" | "update",
  input: QuestionInput,
  id?: string
) {
  const full = questionColumns(input);
  const { options, correct_index, option_a, option_b, option_c, option_d, correct_answer, ...base } =
    full;
  const canonical = { ...base, options, correct_index };
  const legacy = { ...base, option_a, option_b, option_c, option_d, correct_answer };

  const run = async (body: Record<string, unknown>) => {
    if (mode === "insert") {
      return supabase
        .from("question_bank")
        .insert({ ...body, sort_order: await nextSort("question_bank") })
        .select("*")
        .single();
    }
    return supabase.from("question_bank").update(body).eq("id", id!).select("*").single();
  };

  const missing = (message: string, column: RegExp) =>
    column.test(message) && /(column|schema cache|does not exist)/i.test(message);

  let result = await run(full);
  if (result.error && missing(result.error.message, /options|correct_index/i)) {
    result = await run(legacy);
  } else if (result.error && missing(result.error.message, /option_|correct_answer/i)) {
    result = await run(canonical);
  }
  return result;
}

export async function createQuestion(
  input: QuestionInput
): Promise<ActionResult<QuestionBankItem>> {
  try {
    if (!input.question_text.trim()) return { success: false, error: "نص السؤال مطلوب" };
    const filled = input.options.map((item) => item.trim()).filter(Boolean);
    if (filled.length < 2) {
      return { success: false, error: "الخيارات أ وب مطلوبان على الأقل" };
    }
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const { data, error } = await writeQuestion("insert", input);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeQuestion(data as Record<string, unknown>),
      message: "تمت إضافة السؤال",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateQuestion(
  id: string,
  input: QuestionInput
): Promise<ActionResult<QuestionBankItem>> {
  try {
    if (!id) return { success: false, error: "معرّف غير صالح" };
    if (!input.question_text.trim()) return { success: false, error: "نص السؤال مطلوب" };
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "اختر المرحلة والصف" };
    }
    const { data, error } = await writeQuestion("update", input, id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeQuestion(data as Record<string, unknown>),
      message: "تم تحديث السؤال",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleQuestionActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<QuestionBankItem>> {
  try {
    const { data, error } = await supabase
      .from("question_bank")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: normalizeQuestion(data as Record<string, unknown>),
      message: is_active ? "تم التفعيل" : "تم الإيقاف",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteQuestion(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase.from("question_bank").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(REVALIDATE);
    return { success: true, message: "تم الحذف" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// —— Settings (grade calculator) ——

export async function getTeacherSpaceSettings(): Promise<
  ActionResult<TeacherSpaceSettings>
> {
  try {
    const { data, error } = await supabase
      .from("teacher_space_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) {
      const inserted = await supabase
        .from("teacher_space_settings")
        .upsert({ id: 1, grade_calculator_active: true })
        .select("*")
        .single();
      if (inserted.error) return { success: false, error: inserted.error.message };
      return {
        success: true,
        data: {
          id: 1,
          grade_calculator_active: asBool(
            (inserted.data as Record<string, unknown>).grade_calculator_active
          ),
        },
      };
    }
    return {
      success: true,
      data: {
        id: 1,
        grade_calculator_active: asBool(
          (data as Record<string, unknown>).grade_calculator_active
        ),
        updated_at: data.updated_at ? String(data.updated_at) : undefined,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function setGradeCalculatorActive(
  active: boolean
): Promise<ActionResult<TeacherSpaceSettings>> {
  try {
    const { data, error } = await supabase
      .from("teacher_space_settings")
      .upsert({
        id: 1,
        grade_calculator_active: active,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    await supabase.from("site_tool_settings").upsert(
      {
        tool_key: "grade_calculator",
        is_active: active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tool_key" }
    );
    revalidatePath(REVALIDATE);
    return {
      success: true,
      data: {
        id: 1,
        grade_calculator_active: asBool(
          (data as Record<string, unknown>).grade_calculator_active
        ),
      },
      message: active ? "تم تفعيل آلة حساب الدرجات" : "تم إيقاف آلة حساب الدرجات",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
