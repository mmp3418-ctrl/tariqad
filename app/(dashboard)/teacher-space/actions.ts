"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type {
  ActionResult,
  TeacherSpaceCategory,
  TeacherSpaceItem,
} from "@/lib/types";

/** Canonical table for teacher tools */
const TABLE = "teacher_resources";
const SELECT =
  "id, category, title_ar, title_en, description_ar, url, grade_id, unit_id, is_coming_soon, sort_order, created_at, grades(id, title_ar), units(id, title_ar)";

function revalidate() {
  revalidatePath("/teacher-space");
}

export async function getTeacherSpaceItems(filters?: {
  category?: TeacherSpaceCategory;
  grade_id?: string;
  unit_id?: string;
}): Promise<ActionResult<TeacherSpaceItem[]>> {
  const authError = await requireAuth<TeacherSpaceItem[]>();
  if (authError) return authError;

  let query = supabase
    .from(TABLE)
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.grade_id) query = query.eq("grade_id", filters.grade_id);
  if (filters?.unit_id) query = query.eq("unit_id", filters.unit_id);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: ((data as unknown) as TeacherSpaceItem[]) ?? [],
  };
}

export async function createTeacherSpaceItem(input: {
  category: TeacherSpaceCategory;
  title_ar: string;
  description_ar: string;
  url: string;
  grade_id: string;
  unit_id: string;
  is_coming_soon: boolean;
}): Promise<ActionResult<TeacherSpaceItem>> {
  const authError = await requireAuth<TeacherSpaceItem>();
  if (authError) return authError;

  if (!input.grade_id) {
    return { success: false, error: "يجب اختيار الصف الدراسي" };
  }
  if (!input.unit_id) {
    return { success: false, error: "يجب اختيار الوحدة الدراسية" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط مطلوبان" };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      category: input.category,
      title_ar: input.title_ar.trim(),
      title_en: "",
      description_ar: input.description_ar.trim() || null,
      url: input.url.trim(),
      grade_id: input.grade_id,
      unit_id: input.unit_id,
      is_coming_soon: input.is_coming_soon ?? false,
      sort_order: 0,
    })
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as unknown as TeacherSpaceItem,
    message: "تم إضافة العنصر",
  };
}

export async function updateTeacherSpaceItem(
  id: string,
  input: {
    category: TeacherSpaceCategory;
    title_ar: string;
    description_ar: string;
    url: string;
    grade_id: string;
    unit_id: string;
    is_coming_soon: boolean;
  }
): Promise<ActionResult<TeacherSpaceItem>> {
  const authError = await requireAuth<TeacherSpaceItem>();
  if (authError) return authError;

  if (!input.grade_id || !input.unit_id) {
    return { success: false, error: "الصف والوحدة مطلوبان" };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      category: input.category,
      title_ar: input.title_ar.trim(),
      description_ar: input.description_ar.trim() || null,
      url: input.url.trim(),
      grade_id: input.grade_id,
      unit_id: input.unit_id,
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as unknown as TeacherSpaceItem,
    message: "تم التحديث",
  };
}

export async function toggleTeacherSpaceComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from(TABLE)
    .update({ is_coming_soon })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    message: is_coming_soon ? "تم تعليم العنصر كـ قريباً" : "تم إلغاء قريباً",
  };
}

export async function deleteTeacherSpaceItem(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, message: "تم الحذف" };
}
