"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import {
  normalizeRelatedTitle,
  normalizeResourceRow,
  parseQuestionData,
  toResourceWritePayload,
} from "@/lib/schema-compat";
import type {
  ActionResult,
  GradeStage,
  ResourceCategory,
  ResourceType,
  ResourceWithGrade,
  TargetAudience,
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

const SELECT_CHAINS = [
  "*, grades(id, title, stage), units(id, title), lessons(id, title)",
  "*, grades(id, title), units(id, title)",
  "*, grades(id, title_ar, stage), units(id, title_ar), lessons(id, title_ar)",
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
    type: (base.type as ResourceType) || "pdf",
    title_ar: base.title_ar,
    title_en: base.title_en,
    subject_ar: base.subject_ar,
    subject_en: base.subject_en,
    term: (base.term as string | null) ?? null,
    url: base.url,
    description_ar: base.description_ar,
    description_en: (base.description_en as string | null) ?? null,
    badge_color: String(base.badge_color ?? "#0f766e"),
    icon_type: String(base.icon_type ?? "file-text"),
    cover_image_url: (base.cover_image_url as string | null) ?? null,
    resource_category:
      (base.resource_category as ResourceWithGrade["resource_category"]) ?? null,
    target_audience:
      (base.target_audience as TargetAudience | null) ?? null,
    question_data: parseQuestionData(base.question_data),
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

function buildPayload(input: MediaInput) {
  return toResourceWritePayload({
    grade_id: input.grade_id,
    unit_id: input.unit_id?.trim() || null,
    lesson_id: input.lesson_id?.trim() || null,
    type: input.type,
    title: input.title_ar.trim(),
    file_url: input.url.trim(),
    description: input.description_ar?.trim() || null,
    resource_category: input.resource_category || null,
    is_coming_soon: input.is_coming_soon ?? false,
  });
}

async function queryResources(opts: {
  types: string[];
  unitId?: string;
}): Promise<ActionResult<ResourceWithGrade[]>> {
  let lastError: string | null = null;
  const orderKeys = ["order_index", "title", "title_ar", "created_at"] as const;

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
          data: (
            (ordered.data as unknown as Record<string, unknown>[]) ?? []
          ).map(normalizeMediaRow),
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

  console.error("[media] queryResources failed:", lastError);
  return { success: false, error: lastError ?? "فشل جلب الموارد" };
}

export async function getMediaByType(
  type: ResourceType
): Promise<ActionResult<ResourceWithGrade[]>> {
  try {
    const authError = await requireAuth<ResourceWithGrade[]>();
    if (authError) return authError;

    const types = type === "video" ? ["video", "playlist"] : ["pdf"];
    return queryResources({ types });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[media] getMediaByType exception:", err);
    return { success: false, error: message };
  }
}

export async function getMediaByUnit(
  unitId: string,
  type: ResourceType = "pdf"
): Promise<ActionResult<ResourceWithGrade[]>> {
  try {
    const authError = await requireAuth<ResourceWithGrade[]>();
    if (authError) return authError;

    const types = type === "video" ? ["video", "playlist"] : ["pdf"];
    return queryResources({ types, unitId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[media] getMediaByUnit exception:", err);
    return { success: false, error: message };
  }
}

export async function createMedia(
  input: MediaInput
): Promise<ActionResult<ResourceWithGrade>> {
  try {
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

    const payload = buildPayload(input);
    const { data, error } = await insertFlexible<Record<string, unknown>>(
      "resources",
      payload
    );

    if (error || !data) {
      console.error("[media] createMedia:", error, payload);
      return { success: false, error: error ?? "فشل الحفظ" };
    }

    revalidateMedia();
    return {
      success: true,
      data: normalizeMediaRow(data),
      message: "تم الحفظ بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[media] createMedia exception:", err);
    return { success: false, error: message };
  }
}

export async function updateMedia(
  id: string,
  input: MediaInput
): Promise<ActionResult<ResourceWithGrade>> {
  try {
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

    const payload = buildPayload(input);
    const { data, error } = await updateFlexible<Record<string, unknown>>(
      "resources",
      id,
      payload
    );

    if (error || !data) {
      console.error("[media] updateMedia:", error, payload);
      return { success: false, error: error ?? "فشل التحديث" };
    }

    revalidateMedia();
    return {
      success: true,
      data: normalizeMediaRow(data),
      message: "تم التحديث بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[media] updateMedia exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      console.error("[media] deleteMedia:", error.message);
      return { success: false, error: error.message };
    }
    revalidateMedia();
    return { success: true, message: "تم الحذف" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[media] deleteMedia exception:", err);
    return { success: false, error: message };
  }
}
