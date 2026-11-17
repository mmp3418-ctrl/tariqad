"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import {
  normalizeRelatedTitle,
  normalizeResourceRow,
} from "@/lib/schema-compat";
import type {
  ActionResult,
  GradeStage,
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
  const lessonId = input.lesson_id?.trim() || null;
  const unitId = input.unit_id?.trim() || null;

  return {
    grade_id: input.grade_id,
    unit_id: unitId,
    lesson_id: lessonId,
    type: input.type,
    title_ar: input.title_ar.trim(),
    title_en: "",
    subject_ar: (input.subject_ar || input.title_ar).trim(),
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

const SELECT_CHAINS = [
  "*, grades(id, title_ar, stage), units(id, title_ar), lessons(id, title_ar)",
  "*, grades(id, title_ar, stage), units(id, title_ar)",
  "*, grades(id, title, stage), units(id, title), lessons(id, title)",
  "*, grades(id, title, stage), units(id, title)",
  "*, grades(*), units(*), lessons(*)",
  "*",
];

function revalidateMedia() {
  revalidatePath("/notes");
  revalidatePath("/units");
  revalidatePath("/videos");
}

function normalizeMediaRow(row: Record<string, unknown>): ResourceWithGrade {
  const base = normalizeResourceRow(row);
  const grades = normalizeRelatedTitle(row.grades);
  const units = normalizeRelatedTitle(row.units);
  const lessons = normalizeRelatedTitle(row.lessons);

  return {
    id: String(base.id),
    grade_id: String(base.grade_id ?? ""),
    unit_id: (base.unit_id as string | null) ?? null,
    lesson_id: (base.lesson_id as string | null) ?? null,
    type: base.type as ResourceType,
    title_ar: base.title_ar,
    title_en: base.title_en,
    subject_ar: base.subject_ar,
    subject_en: base.subject_en,
    term: (base.term as string | null) ?? null,
    url: base.url,
    description_ar: (base.description_ar as string | null) ?? null,
    description_en: (base.description_en as string | null) ?? null,
    badge_color: String(base.badge_color ?? "#0f766e"),
    icon_type: String(base.icon_type ?? "file-text"),
    cover_image_url: (base.cover_image_url as string | null) ?? null,
    resource_category:
      (base.resource_category as ResourceWithGrade["resource_category"]) ?? null,
    is_coming_soon: Boolean(base.is_coming_soon),
    grades: grades
      ? {
          id: grades.id,
          title_ar: grades.title_ar,
          title_en: grades.title_ar,
          stage: (grades.stage as GradeStage) || "primary",
        }
      : null,
    units: units ? { id: units.id, title_ar: units.title_ar } : null,
    lessons: lessons ? { id: lessons.id, title_ar: lessons.title_ar } : null,
  };
}

async function queryResources(opts: {
  types: string[];
  unitId?: string;
}): Promise<ActionResult<ResourceWithGrade[]>> {
  let lastError: string | null = null;
  const orderKeys = ["title_ar", "title", "created_at"] as const;

  for (const select of SELECT_CHAINS) {
    for (const orderKey of orderKeys) {
      let query = supabase
        .from("resources")
        .select(select)
        .in("type", opts.types);
      if (opts.unitId) query = query.eq("unit_id", opts.unitId);

      const ordered = await query.order(orderKey, { ascending: true });
      if (!ordered.error) {
        return {
          success: true,
          data: ((ordered.data as unknown as Record<string, unknown>[]) ?? []).map(
            normalizeMediaRow
          ),
        };
      }
      lastError = ordered.error.message;
    }

    let plain = supabase
      .from("resources")
      .select(select)
      .in("type", opts.types);
    if (opts.unitId) plain = plain.eq("unit_id", opts.unitId);
    const result = await plain;
    if (!result.error) {
      return {
        success: true,
        data: ((result.data as unknown as Record<string, unknown>[]) ?? []).map(
          normalizeMediaRow
        ),
      };
    }
    lastError = result.error.message;
  }

  return { success: false, error: lastError ?? "فشل جلب الموارد" };
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

  if (!input.grade_id?.trim()) {
    return { success: false, error: "يجب اختيار الصف الدراسي" };
  }
  if (input.type === "pdf" && !input.unit_id?.trim()) {
    return { success: false, error: "يجب ربط المذكرة بوحدة دراسية" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط/الملف مطلوبان" };
  }
  if (!input.resource_category) {
    return { success: false, error: "يجب اختيار تصنيف المادة" };
  }

  if (input.unit_id?.trim()) {
    const { data: unitRow, error: unitError } = await supabase
      .from("units")
      .select("id, grade_id")
      .eq("id", input.unit_id.trim())
      .maybeSingle();
    if (unitError) return { success: false, error: unitError.message };
    if (!unitRow || unitRow.grade_id !== input.grade_id) {
      return { success: false, error: "الوحدة لا تتبع الصف المحدد" };
    }
  }

  const { data, error } = await insertFlexible<Record<string, unknown>>(
    "resources",
    toPayload(input)
  );

  if (error || !data) return { success: false, error: error ?? "فشل الحفظ" };
  revalidateMedia();
  return {
    success: true,
    data: normalizeMediaRow(data),
    message: "تم الحفظ بنجاح",
  };
}

export async function updateMedia(
  id: string,
  input: MediaInput
): Promise<ActionResult<ResourceWithGrade>> {
  const authError = await requireAuth<ResourceWithGrade>();
  if (authError) return authError;

  if (!input.grade_id?.trim() || !input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "الحقول الأساسية مطلوبة" };
  }
  if (input.type === "pdf" && !input.unit_id?.trim()) {
    return { success: false, error: "يجب ربط المذكرة بوحدة دراسية" };
  }
  if (!input.resource_category) {
    return { success: false, error: "يجب اختيار تصنيف المادة" };
  }

  if (input.unit_id?.trim()) {
    const { data: unitRow, error: unitError } = await supabase
      .from("units")
      .select("id, grade_id")
      .eq("id", input.unit_id.trim())
      .maybeSingle();
    if (unitError) return { success: false, error: unitError.message };
    if (!unitRow || unitRow.grade_id !== input.grade_id) {
      return { success: false, error: "الوحدة لا تتبع الصف المحدد" };
    }
  }

  const { data, error } = await updateFlexible<Record<string, unknown>>(
    "resources",
    id,
    toPayload(input)
  );

  if (error || !data) return { success: false, error: error ?? "فشل التحديث" };
  revalidateMedia();
  return {
    success: true,
    data: normalizeMediaRow(data),
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
