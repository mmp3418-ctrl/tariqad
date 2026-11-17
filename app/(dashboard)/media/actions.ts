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
    subject_ar: input.subject_ar.trim() || input.title_ar.trim(),
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

const SELECT_FULL =
  "*, grades(id, title_ar, title_en, stage), units(id, title_ar), lessons(id, title_ar)";
const SELECT_SAFE =
  "*, grades(id, title_ar, stage), units(id, title_ar), lessons(id, title_ar)";

function revalidateMedia() {
  revalidatePath("/notes");
  revalidatePath("/units");
  revalidatePath("/videos");
}

async function queryResources(opts: {
  types: string[];
  unitId?: string;
}): Promise<ActionResult<ResourceWithGrade[]>> {
  let fullQuery = supabase
    .from("resources")
    .select(SELECT_FULL)
    .in("type", opts.types);
  if (opts.unitId) fullQuery = fullQuery.eq("unit_id", opts.unitId);

  const full = await fullQuery.order("title_ar", { ascending: true });
  if (!full.error) {
    return { success: true, data: (full.data as ResourceWithGrade[]) ?? [] };
  }

  let safeQuery = supabase
    .from("resources")
    .select(SELECT_SAFE)
    .in("type", opts.types);
  if (opts.unitId) safeQuery = safeQuery.eq("unit_id", opts.unitId);

  const safe = await safeQuery.order("title_ar", { ascending: true });
  if (safe.error) return { success: false, error: safe.error.message };
  return { success: true, data: (safe.data as ResourceWithGrade[]) ?? [] };
}

export async function getMediaByType(
  type: ResourceType
): Promise<ActionResult<ResourceWithGrade[]>> {
  const authError = await requireAuth<ResourceWithGrade[]>();
  if (authError) return authError;

  const types = type === "video" ? ["video", "playlist"] : ["pdf"];
  return queryResources({ types });
}

export async function getMediaByUnit(
  unitId: string,
  type: ResourceType = "pdf"
): Promise<ActionResult<ResourceWithGrade[]>> {
  const authError = await requireAuth<ResourceWithGrade[]>();
  if (authError) return authError;

  const types = type === "video" ? ["video", "playlist"] : ["pdf"];
  return queryResources({ types, unitId });
}

export async function createMedia(
  input: MediaInput
): Promise<ActionResult<ResourceWithGrade>> {
  const authError = await requireAuth<ResourceWithGrade>();
  if (authError) return authError;

  if (!input.grade_id) {
    return { success: false, error: "يجب اختيار الصف الدراسي" };
  }
  if (input.type === "pdf" && !input.unit_id) {
    return { success: false, error: "يجب ربط المذكرة بوحدة دراسية" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط/الملف مطلوبان" };
  }
  if (!input.resource_category) {
    return { success: false, error: "يجب اختيار تصنيف المادة" };
  }

  const payload = toPayload(input);
  let result = await supabase
    .from("resources")
    .insert(payload)
    .select(SELECT_FULL)
    .single();

  if (result.error) {
    result = await supabase
      .from("resources")
      .insert(payload)
      .select(SELECT_SAFE)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidateMedia();
  return {
    success: true,
    data: result.data as unknown as ResourceWithGrade,
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
  if (input.type === "pdf" && !input.unit_id) {
    return { success: false, error: "يجب ربط المذكرة بوحدة دراسية" };
  }
  if (!input.resource_category) {
    return { success: false, error: "يجب اختيار تصنيف المادة" };
  }

  const payload = toPayload(input);
  let result = await supabase
    .from("resources")
    .update(payload)
    .eq("id", id)
    .select(SELECT_FULL)
    .single();

  if (result.error) {
    result = await supabase
      .from("resources")
      .update(payload)
      .eq("id", id)
      .select(SELECT_SAFE)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidateMedia();
  return {
    success: true,
    data: result.data as unknown as ResourceWithGrade,
    message: "تم التحديث بنجاح",
  };
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateMedia();
  return { success: true, message: "تم الحذف" };
}
