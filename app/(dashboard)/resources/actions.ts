"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type {
  ActionResult,
  BadgeColor,
  ResourceIconType,
  ResourceType,
  ResourceWithGrade,
} from "@/lib/types";

export type ResourceInput = {
  grade_id: string;
  type: ResourceType;
  title_ar: string;
  title_en: string;
  subject_ar: string;
  subject_en: string;
  term: string;
  url: string;
  description_ar: string;
  description_en: string;
  badge_color: BadgeColor;
  icon_type: ResourceIconType;
};

function toPayload(input: ResourceInput) {
  return {
    grade_id: input.grade_id,
    type: input.type,
    title_ar: input.title_ar.trim(),
    title_en: input.title_en.trim(),
    subject_ar: input.subject_ar.trim(),
    subject_en: input.subject_en.trim(),
    term: input.term.trim() || null,
    url: input.url.trim(),
    description_ar: input.description_ar.trim() || null,
    description_en: input.description_en.trim() || null,
    badge_color: input.badge_color,
    icon_type: input.icon_type,
  };
}

export async function getResources(
  gradeId?: string
): Promise<ActionResult<ResourceWithGrade[]>> {
  const authError = await requireAuth<ResourceWithGrade[]>();
  if (authError) return authError;

  let query = supabase
    .from("resources")
    .select("*, grades(id, title_ar, title_en, stage)")
    .order("subject_ar", { ascending: true });

  if (gradeId) {
    query = query.eq("grade_id", gradeId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as ResourceWithGrade[]) ?? [] };
}

export async function createResource(
  input: ResourceInput
): Promise<ActionResult<ResourceWithGrade>> {
  const authError = await requireAuth<ResourceWithGrade>();
  if (authError) return authError;

  if (!input.grade_id) {
    return { success: false, error: "يجب اختيار الصف الدراسي" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط مطلوبان" };
  }

  const { data, error } = await supabase
    .from("resources")
    .insert(toPayload(input))
    .select("*, grades(id, title_ar, title_en, stage)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");
  return {
    success: true,
    data: data as ResourceWithGrade,
    message: "تم إضافة المذكرة بنجاح",
  };
}

export async function updateResource(
  id: string,
  input: ResourceInput
): Promise<ActionResult<ResourceWithGrade>> {
  const authError = await requireAuth<ResourceWithGrade>();
  if (authError) return authError;

  if (!input.grade_id) {
    return { success: false, error: "يجب اختيار الصف الدراسي" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط مطلوبان" };
  }

  const { data, error } = await supabase
    .from("resources")
    .update(toPayload(input))
    .eq("id", id)
    .select("*, grades(id, title_ar, title_en, stage)")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");
  return {
    success: true,
    data: data as ResourceWithGrade,
    message: "تم تحديث المذكرة بنجاح",
  };
}

export async function deleteResource(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("resources").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/resources");
  return { success: true, message: "تم حذف المذكرة" };
}
