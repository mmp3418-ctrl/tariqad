"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type {
  ActionResult,
  TeacherSpaceCategory,
  TeacherSpaceItem,
} from "@/lib/types";

const SELECT = "*, grades(id, title_ar)";

export async function getTeacherSpaceItems(
  category?: TeacherSpaceCategory
): Promise<ActionResult<TeacherSpaceItem[]>> {
  const authError = await requireAuth<TeacherSpaceItem[]>();
  if (authError) return authError;

  let query = supabase
    .from("teacher_space_items")
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as TeacherSpaceItem[]) ?? [] };
}

export async function createTeacherSpaceItem(input: {
  category: TeacherSpaceCategory;
  title_ar: string;
  description_ar: string;
  url: string;
  grade_id: string;
  is_coming_soon: boolean;
}): Promise<ActionResult<TeacherSpaceItem>> {
  const authError = await requireAuth<TeacherSpaceItem>();
  if (authError) return authError;

  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط مطلوبان" };
  }

  const { data, error } = await supabase
    .from("teacher_space_items")
    .insert({
      category: input.category,
      title_ar: input.title_ar.trim(),
      title_en: "",
      description_ar: input.description_ar.trim() || null,
      url: input.url.trim(),
      grade_id: input.grade_id || null,
      is_coming_soon: input.is_coming_soon,
      sort_order: 0,
    })
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/teacher-space");
  return {
    success: true,
    data: data as TeacherSpaceItem,
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
    is_coming_soon: boolean;
  }
): Promise<ActionResult<TeacherSpaceItem>> {
  const authError = await requireAuth<TeacherSpaceItem>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("teacher_space_items")
    .update({
      category: input.category,
      title_ar: input.title_ar.trim(),
      description_ar: input.description_ar.trim() || null,
      url: input.url.trim(),
      grade_id: input.grade_id || null,
      is_coming_soon: input.is_coming_soon,
    })
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/teacher-space");
  return {
    success: true,
    data: data as TeacherSpaceItem,
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
    .from("teacher_space_items")
    .update({ is_coming_soon })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/teacher-space");
  return {
    success: true,
    message: is_coming_soon ? "تم تعليم العنصر كـ قريباً" : "تم إلغاء قريباً",
  };
}

export async function deleteTeacherSpaceItem(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("teacher_space_items")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/teacher-space");
  return { success: true, message: "تم الحذف" };
}
