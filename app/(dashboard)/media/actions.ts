"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type {
  ActionResult,
  ResourceCategory,
  ResourceType,
  ResourceWithGrade,
} from "@/lib/types";

export type MediaInput = {
  grade_id: string;
  unit_id: string;
  lesson_id: string;
  type: ResourceType;
  title_ar: string;
  subject_ar: string;
  url: string;
  description_ar: string;
  badge_color: string;
  icon_type: string;
  cover_image_url: string;
  resource_category: ResourceCategory | "";
  is_coming_soon: boolean;
};

function toPayload(input: MediaInput) {
  return {
    grade_id: input.grade_id,
    unit_id: input.unit_id || null,
    lesson_id: input.lesson_id || null,
    type: input.type,
    title_ar: input.title_ar.trim(),
    title_en: "",
    subject_ar: input.subject_ar.trim(),
    subject_en: "",
    term: null,
    url: input.url.trim(),
    description_ar: input.description_ar.trim() || null,
    description_en: null,
    badge_color: input.badge_color || "#0f766e",
    icon_type: input.icon_type || "file-text",
    cover_image_url: input.cover_image_url.trim() || null,
    resource_category: input.resource_category || null,
    is_coming_soon: input.is_coming_soon ?? false,
  };
}

const SELECT =
  "*, grades(id, title_ar, title_en, stage), units(id, title_ar), lessons(id, title_ar)";

export async function getMediaByType(
  type: ResourceType
): Promise<ActionResult<ResourceWithGrade[]>> {
  const authError = await requireAuth<ResourceWithGrade[]>();
  if (authError) return authError;

  const types = type === "video" ? ["video", "playlist"] : ["pdf"];

  const { data, error } = await supabase
    .from("resources")
    .select(SELECT)
    .in("type", types)
    .order("subject_ar", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as ResourceWithGrade[]) ?? [] };
}

export async function createMedia(
  input: MediaInput
): Promise<ActionResult<ResourceWithGrade>> {
  const authError = await requireAuth<ResourceWithGrade>();
  if (authError) return authError;

  if (!input.grade_id) {
    return { success: false, error: "يجب اختيار الصف الدراسي" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط/الملف مطلوبان" };
  }
  if (!input.resource_category) {
    return { success: false, error: "يجب اختيار تصنيف المادة" };
  }

  const { data, error } = await supabase
    .from("resources")
    .insert(toPayload(input))
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/notes");
  revalidatePath("/videos");
  return {
    success: true,
    data: data as ResourceWithGrade,
    message: "تم الحفظ بنجاح",
  };
}

export async function updateMedia(
  id: string,
  input: MediaInput
): Promise<ActionResult<ResourceWithGrade>> {
  const authError = await requireAuth<ResourceWithGrade>();
  if (authError) return authError;

  if (!input.grade_id || !input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "الحقول الأساسية مطلوبة" };
  }
  if (!input.resource_category) {
    return { success: false, error: "يجب اختيار تصنيف المادة" };
  }

  const { data, error } = await supabase
    .from("resources")
    .update(toPayload(input))
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/notes");
  revalidatePath("/videos");
  return {
    success: true,
    data: data as ResourceWithGrade,
    message: "تم التحديث بنجاح",
  };
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/notes");
  revalidatePath("/videos");
  return { success: true, message: "تم الحذف" };
}
