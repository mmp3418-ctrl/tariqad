"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import { normalizeTitleFields } from "@/lib/schema-compat";
import type { ActionResult, Lesson, Unit, UnitWithLessons } from "@/lib/types";

const UNIT_SELECTS = [
  "id, grade_id, title_ar, title_en, sort_order, is_coming_soon",
  "id, grade_id, title_ar, sort_order, is_coming_soon",
  "id, grade_id, title_ar, title_en, sort_order",
  "id, grade_id, title_ar",
  "id, grade_id, title, sort_order",
  "id, grade_id, title",
  "*",
];

const LESSON_SELECTS = [
  "id, unit_id, title_ar, title_en, sort_order, is_coming_soon",
  "id, unit_id, title_ar, sort_order, is_coming_soon",
  "id, unit_id, title_ar, title_en, sort_order",
  "id, unit_id, title_ar",
  "id, unit_id, title, sort_order",
  "id, unit_id, title",
  "*",
];

function revalidate() {
  revalidatePath("/units");
  revalidatePath("/notes");
  revalidatePath("/videos");
  revalidatePath("/teacher-space");
}

function normalizeUnit(row: Record<string, unknown>): Unit {
  const titled = normalizeTitleFields(row);
  return {
    id: String(titled.id),
    grade_id: String(titled.grade_id),
    title_ar: titled.title_ar,
    title_en: titled.title_en,
    sort_order: Number(titled.sort_order ?? 0),
    is_coming_soon: Boolean(titled.is_coming_soon),
  };
}

function normalizeLesson(row: Record<string, unknown>): Lesson {
  const titled = normalizeTitleFields(row);
  return {
    id: String(titled.id),
    unit_id: String(titled.unit_id),
    title_ar: titled.title_ar,
    title_en: titled.title_en,
    sort_order: Number(titled.sort_order ?? 0),
    is_coming_soon: Boolean(titled.is_coming_soon),
  };
}

async function fetchUnits(gradeId: string) {
  for (const select of UNIT_SELECTS) {
    const withSort = await supabase
      .from("units")
      .select(select)
      .eq("grade_id", gradeId)
      .order("sort_order", { ascending: true });

    if (!withSort.error) return withSort;

    const bare = await supabase
      .from("units")
      .select(select)
      .eq("grade_id", gradeId);

    if (!bare.error) return bare;
  }

  return supabase.from("units").select("*").eq("grade_id", gradeId);
}

async function fetchLessons(unitIds: string[]) {
  for (const select of LESSON_SELECTS) {
    const withSort = await supabase
      .from("lessons")
      .select(select)
      .in("unit_id", unitIds)
      .order("sort_order", { ascending: true });

    if (!withSort.error) return withSort;

    const bare = await supabase
      .from("lessons")
      .select(select)
      .in("unit_id", unitIds);

    if (!bare.error) return bare;
  }

  return supabase.from("lessons").select("*").in("unit_id", unitIds);
}

export async function getUnitsByGrade(
  gradeId: string
): Promise<ActionResult<UnitWithLessons[]>> {
  const authError = await requireAuth<UnitWithLessons[]>();
  if (authError) return authError;

  const { data: units, error } = await fetchUnits(gradeId);
  if (error) return { success: false, error: error.message };

  const unitList = ((units as Record<string, unknown>[]) ?? []).map(
    normalizeUnit
  );
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

  const { data, error } = await insertFlexible<Record<string, unknown>>(
    "units",
    payload
  );
  if (error || !data) return { success: false, error: error ?? "فشل الحفظ" };
  revalidate();
  return {
    success: true,
    data: normalizeUnit(data),
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

  const { data, error } = await updateFlexible<Record<string, unknown>>(
    "units",
    id,
    payload
  );
  if (error || !data) return { success: false, error: error ?? "فشل التحديث" };
  revalidate();
  return {
    success: true,
    data: normalizeUnit(data),
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

  const { data, error } = await insertFlexible<Record<string, unknown>>(
    "lessons",
    payload
  );
  if (error || !data) return { success: false, error: error ?? "فشل الحفظ" };
  revalidate();
  return {
    success: true,
    data: normalizeLesson(data),
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

  const { data, error } = await updateFlexible<Record<string, unknown>>(
    "lessons",
    id,
    payload
  );
  if (error || !data) return { success: false, error: error ?? "فشل التحديث" };
  revalidate();
  return {
    success: true,
    data: normalizeLesson(data),
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
