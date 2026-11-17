"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, Lesson, Unit, UnitWithLessons } from "@/lib/types";

const UNIT_SELECT = "id, grade_id, title_ar, title_en, sort_order, is_coming_soon";
const UNIT_SELECT_MIN = "id, grade_id, title_ar, sort_order, is_coming_soon";
const LESSON_SELECT =
  "id, unit_id, title_ar, title_en, sort_order, is_coming_soon";
const LESSON_SELECT_MIN = "id, unit_id, title_ar, sort_order, is_coming_soon";

function revalidate() {
  revalidatePath("/units");
  revalidatePath("/notes");
  revalidatePath("/videos");
  revalidatePath("/teacher-space");
}

function normalizeUnit(row: Record<string, unknown>): Unit {
  return {
    id: String(row.id),
    grade_id: String(row.grade_id),
    title_ar: String(row.title_ar ?? ""),
    title_en: String(row.title_en ?? row.title_ar ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_coming_soon: Boolean(row.is_coming_soon),
  };
}

function normalizeLesson(row: Record<string, unknown>): Lesson {
  return {
    id: String(row.id),
    unit_id: String(row.unit_id),
    title_ar: String(row.title_ar ?? ""),
    title_en: String(row.title_en ?? row.title_ar ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_coming_soon: Boolean(row.is_coming_soon),
  };
}

async function fetchUnits(gradeId: string) {
  const full = await supabase
    .from("units")
    .select(UNIT_SELECT)
    .eq("grade_id", gradeId)
    .order("sort_order", { ascending: true });

  if (!full.error) return full;

  const min = await supabase
    .from("units")
    .select(UNIT_SELECT_MIN)
    .eq("grade_id", gradeId)
    .order("sort_order", { ascending: true });

  if (!min.error) return min;

  // Last resort: no sort_order column
  return supabase.from("units").select("id, grade_id, title_ar").eq("grade_id", gradeId);
}

async function fetchLessons(unitIds: string[]) {
  const full = await supabase
    .from("lessons")
    .select(LESSON_SELECT)
    .in("unit_id", unitIds)
    .order("sort_order", { ascending: true });

  if (!full.error) return full;

  const min = await supabase
    .from("lessons")
    .select(LESSON_SELECT_MIN)
    .in("unit_id", unitIds)
    .order("sort_order", { ascending: true });

  if (!min.error) return min;

  return supabase
    .from("lessons")
    .select("id, unit_id, title_ar")
    .in("unit_id", unitIds);
}

export async function getUnitsByGrade(
  gradeId: string
): Promise<ActionResult<UnitWithLessons[]>> {
  const authError = await requireAuth<UnitWithLessons[]>();
  if (authError) return authError;

  const { data: units, error } = await fetchUnits(gradeId);
  if (error) return { success: false, error: error.message };

  const unitList = ((units as Record<string, unknown>[]) ?? []).map(normalizeUnit);
  if (unitList.length === 0) return { success: true, data: [] };

  const { data: lessons, error: lessonsError } = await fetchLessons(
    unitList.map((u) => u.id)
  );
  if (lessonsError) return { success: false, error: lessonsError.message };

  const lessonList = ((lessons as Record<string, unknown>[]) ?? []).map(
    normalizeLesson
  );

  const data: UnitWithLessons[] = unitList.map((unit) => ({
    ...unit,
    lessons: lessonList.filter((l) => l.unit_id === unit.id),
  }));

  return { success: true, data };
}

export async function createUnit(input: {
  grade_id: string;
  title_ar: string;
  title_en?: string;
  is_coming_soon?: boolean;
}): Promise<ActionResult<Unit>> {
  const authError = await requireAuth<Unit>();
  if (authError) return authError;

  if (!input.grade_id || !input.title_ar.trim()) {
    return { success: false, error: "الصف وعنوان الوحدة مطلوبان" };
  }

  const { data: last } = await supabase
    .from("units")
    .select("sort_order")
    .eq("grade_id", input.grade_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order =
    ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;

  const title_ar = input.title_ar.trim();
  const payload = {
    grade_id: input.grade_id,
    title_ar,
    title_en: (input.title_en || title_ar).trim(),
    sort_order,
    is_coming_soon: input.is_coming_soon ?? false,
  };

  let result = await supabase.from("units").insert(payload).select(UNIT_SELECT).single();

  if (result.error && result.error.message.toLowerCase().includes("title_en")) {
    const { title_en: _drop, ...withoutEn } = payload;
    result = await supabase
      .from("units")
      .insert(withoutEn)
      .select(UNIT_SELECT_MIN)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidate();
  return {
    success: true,
    data: normalizeUnit(result.data as Record<string, unknown>),
    message: "تم إضافة الوحدة",
  };
}

export async function updateUnit(
  id: string,
  input: {
    title_ar: string;
    title_en?: string;
    is_coming_soon?: boolean;
  }
): Promise<ActionResult<Unit>> {
  const authError = await requireAuth<Unit>();
  if (authError) return authError;

  const title_ar = input.title_ar.trim();
  const payload = {
    title_ar,
    title_en: (input.title_en || title_ar).trim(),
    is_coming_soon: input.is_coming_soon ?? false,
  };

  let result = await supabase
    .from("units")
    .update(payload)
    .eq("id", id)
    .select(UNIT_SELECT)
    .single();

  if (result.error && result.error.message.toLowerCase().includes("title_en")) {
    const { title_en: _drop, ...withoutEn } = payload;
    result = await supabase
      .from("units")
      .update(withoutEn)
      .eq("id", id)
      .select(UNIT_SELECT_MIN)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidate();
  return {
    success: true,
    data: normalizeUnit(result.data as Record<string, unknown>),
    message: "تم تحديث الوحدة",
  };
}

export async function toggleUnitComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("units")
    .update({ is_coming_soon })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    message: is_coming_soon ? "تم تعليم الوحدة كـ قريباً" : "تم إلغاء قريباً",
  };
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, message: "تم حذف الوحدة" };
}

export async function createLesson(input: {
  unit_id: string;
  title_ar: string;
  title_en?: string;
  is_coming_soon?: boolean;
}): Promise<ActionResult<Lesson>> {
  const authError = await requireAuth<Lesson>();
  if (authError) return authError;

  if (!input.unit_id || !input.title_ar.trim()) {
    return { success: false, error: "الوحدة وعنوان الدرس مطلوبان" };
  }

  const { data: last } = await supabase
    .from("lessons")
    .select("sort_order")
    .eq("unit_id", input.unit_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sort_order =
    ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 1;

  const title_ar = input.title_ar.trim();
  const payload = {
    unit_id: input.unit_id,
    title_ar,
    title_en: (input.title_en || title_ar).trim(),
    sort_order,
    is_coming_soon: input.is_coming_soon ?? false,
  };

  let result = await supabase
    .from("lessons")
    .insert(payload)
    .select(LESSON_SELECT)
    .single();

  if (result.error && result.error.message.toLowerCase().includes("title_en")) {
    const { title_en: _drop, ...withoutEn } = payload;
    result = await supabase
      .from("lessons")
      .insert(withoutEn)
      .select(LESSON_SELECT_MIN)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidate();
  return {
    success: true,
    data: normalizeLesson(result.data as Record<string, unknown>),
    message: "تم إضافة الدرس",
  };
}

export async function updateLesson(
  id: string,
  input: {
    title_ar: string;
    title_en?: string;
    is_coming_soon?: boolean;
  }
): Promise<ActionResult<Lesson>> {
  const authError = await requireAuth<Lesson>();
  if (authError) return authError;

  const title_ar = input.title_ar.trim();
  const payload = {
    title_ar,
    title_en: (input.title_en || title_ar).trim(),
    is_coming_soon: input.is_coming_soon ?? false,
  };

  let result = await supabase
    .from("lessons")
    .update(payload)
    .eq("id", id)
    .select(LESSON_SELECT)
    .single();

  if (result.error && result.error.message.toLowerCase().includes("title_en")) {
    const { title_en: _drop, ...withoutEn } = payload;
    result = await supabase
      .from("lessons")
      .update(withoutEn)
      .eq("id", id)
      .select(LESSON_SELECT_MIN)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidate();
  return {
    success: true,
    data: normalizeLesson(result.data as Record<string, unknown>),
    message: "تم تحديث الدرس",
  };
}

export async function toggleLessonComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("lessons")
    .update({ is_coming_soon })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    message: is_coming_soon ? "تم تعليم الدرس كـ قريباً" : "تم إلغاء قريباً",
  };
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, message: "تم حذف الدرس" };
}
