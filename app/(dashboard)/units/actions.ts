"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, Lesson, Unit, UnitWithLessons } from "@/lib/types";

function revalidate() {
  revalidatePath("/units");
  revalidatePath("/notes");
  revalidatePath("/videos");
  revalidatePath("/teacher-space");
}

export async function getUnitsByGrade(
  gradeId: string
): Promise<ActionResult<UnitWithLessons[]>> {
  const authError = await requireAuth<UnitWithLessons[]>();
  if (authError) return authError;

  const { data: units, error } = await supabase
    .from("units")
    .select("*")
    .eq("grade_id", gradeId)
    .order("sort_order", { ascending: true });

  if (error) return { success: false, error: error.message };

  const unitList = (units as Unit[]) ?? [];
  if (unitList.length === 0) return { success: true, data: [] };

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .in(
      "unit_id",
      unitList.map((u) => u.id)
    )
    .order("sort_order", { ascending: true });

  if (lessonsError) return { success: false, error: lessonsError.message };

  const lessonList = (lessons as Lesson[]) ?? [];
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

  const { data, error } = await supabase
    .from("units")
    .insert({
      grade_id: input.grade_id,
      title_ar: input.title_ar.trim(),
      title_en: (input.title_en || input.title_ar).trim(),
      sort_order,
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, data: data as Unit, message: "تم إضافة الوحدة" };
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

  const { data, error } = await supabase
    .from("units")
    .update({
      title_ar: input.title_ar.trim(),
      title_en: (input.title_en || input.title_ar).trim(),
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, data: data as Unit, message: "تم تحديث الوحدة" };
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

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      unit_id: input.unit_id,
      title_ar: input.title_ar.trim(),
      title_en: (input.title_en || input.title_ar).trim(),
      sort_order,
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, data: data as Lesson, message: "تم إضافة الدرس" };
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

  const { data, error } = await supabase
    .from("lessons")
    .update({
      title_ar: input.title_ar.trim(),
      title_en: (input.title_en || input.title_ar).trim(),
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, data: data as Lesson, message: "تم تحديث الدرس" };
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
