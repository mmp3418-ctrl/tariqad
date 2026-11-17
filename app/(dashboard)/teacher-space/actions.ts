"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import {
  normalizeRelatedTitle,
  normalizeResourceRow,
  normalizeTitleFields,
  toTeacherResourceWritePayload,
} from "@/lib/schema-compat";
import type {
  ActionResult,
  TeacherSpaceCategory,
  TeacherSpaceItem,
} from "@/lib/types";

const TABLE = "teacher_resources";

const SELECT_CHAINS = [
  "id, category, title, description, file_url, grade_id, unit_id, is_active, is_coming_soon, order_index, sort_order, created_at, grades(id, title), units(id, title)",
  "*, grades(id, title), units(id, title)",
  "*, grades(id, title_ar), units(id, title_ar)",
  "*, grades(*), units(*)",
  "*",
];

function revalidate() {
  revalidatePath("/teacher-space");
}

function normalizeItem(row: Record<string, unknown>): TeacherSpaceItem {
  const base = normalizeResourceRow(normalizeTitleFields(row));
  const grades = normalizeRelatedTitle(row.grades);
  const units = normalizeRelatedTitle(row.units);

  return {
    id: String(base.id),
    category: base.category as TeacherSpaceCategory,
    title_ar: base.title_ar,
    title_en: base.title_en,
    description_ar: base.description_ar,
    url: base.url,
    grade_id: (base.grade_id as string | null) ?? null,
    unit_id: (base.unit_id as string | null) ?? null,
    is_active: base.is_active !== false,
    is_coming_soon: Boolean(base.is_coming_soon),
    sort_order: Number(base.sort_order ?? 0),
    created_at: String(base.created_at ?? new Date().toISOString()),
    grades: grades ? { id: grades.id, title_ar: grades.title_ar } : null,
    units: units ? { id: units.id, title_ar: units.title_ar } : null,
  };
}

export async function getTeacherSpaceItems(filters?: {
  category?: TeacherSpaceCategory;
  grade_id?: string;
  unit_id?: string;
}): Promise<ActionResult<TeacherSpaceItem[]>> {
  try {
    const authError = await requireAuth<TeacherSpaceItem[]>();
    if (authError) return authError;

    let lastError: string | null = null;

    for (const select of SELECT_CHAINS) {
      for (const orderKey of ["order_index", "sort_order", "created_at"] as const) {
        let query = supabase.from(TABLE).select(select);
        if (filters?.category) query = query.eq("category", filters.category);
        if (filters?.grade_id) query = query.eq("grade_id", filters.grade_id);
        if (filters?.unit_id) query = query.eq("unit_id", filters.unit_id);

        const sorted = await query.order(orderKey, {
          ascending: orderKey !== "created_at",
        });
        if (!sorted.error) {
          return {
            success: true,
            data: (
              (sorted.data as unknown as Record<string, unknown>[]) ?? []
            ).map(normalizeItem),
          };
        }
        lastError = sorted.error.message;
      }

      let plain = supabase.from(TABLE).select(select);
      if (filters?.category) plain = plain.eq("category", filters.category);
      if (filters?.grade_id) plain = plain.eq("grade_id", filters.grade_id);
      if (filters?.unit_id) plain = plain.eq("unit_id", filters.unit_id);

      const plainRes = await plain;
      if (!plainRes.error) {
        return {
          success: true,
          data: (
            (plainRes.data as unknown as Record<string, unknown>[]) ?? []
          ).map(normalizeItem),
        };
      }
      lastError = plainRes.error.message;
    }

    console.error("[teacher-space] getItems failed:", lastError);
    return { success: false, error: lastError ?? "فشل جلب موارد المعلم" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[teacher-space] getItems exception:", err);
    return { success: false, error: message };
  }
}

export async function createTeacherSpaceItem(input: {
  category: TeacherSpaceCategory;
  title_ar: string;
  description_ar: string;
  url: string;
  grade_id: string;
  unit_id: string;
  is_active: boolean;
  is_coming_soon: boolean;
}): Promise<ActionResult<TeacherSpaceItem>> {
  try {
    const authError = await requireAuth<TeacherSpaceItem>();
    if (authError) return authError;

    if (!input.grade_id?.trim() || !input.unit_id?.trim()) {
      return { success: false, error: "الصف والوحدة مطلوبان" };
    }
    if (!input.title_ar.trim() || !input.url.trim()) {
      return { success: false, error: "العنوان والملف أو الرابط مطلوبان" };
    }

    const { data: unitRow, error: unitError } = await supabase
      .from("units")
      .select("id, grade_id")
      .eq("id", input.unit_id)
      .maybeSingle();
    if (unitError) return { success: false, error: unitError.message };
    if (!unitRow || unitRow.grade_id !== input.grade_id) {
      return { success: false, error: "الوحدة لا تتبع الصف المحدد" };
    }

    const payload = toTeacherResourceWritePayload({
      category: input.category,
      title: input.title_ar.trim(),
      file_url: input.url.trim(),
      description: input.description_ar?.trim() || null,
      grade_id: input.grade_id.trim(),
      unit_id: input.unit_id.trim(),
      is_active: input.is_active ?? true,
      is_coming_soon: input.is_coming_soon ?? false,
    });

    const { data, error } = await insertFlexible<Record<string, unknown>>(
      TABLE,
      payload
    );
    if (error || !data) {
      console.error("[teacher-space] create:", error, payload);
      return { success: false, error: error ?? "فشل الحفظ" };
    }

    revalidate();
    return {
      success: true,
      data: normalizeItem(data),
      message: "تم إضافة المورد",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[teacher-space] create exception:", err);
    return { success: false, error: message };
  }
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
    is_active: boolean;
    is_coming_soon: boolean;
  }
): Promise<ActionResult<TeacherSpaceItem>> {
  try {
    const authError = await requireAuth<TeacherSpaceItem>();
    if (authError) return authError;

    if (!input.grade_id?.trim() || !input.unit_id?.trim()) {
      return { success: false, error: "الصف والوحدة مطلوبان" };
    }

    const { data: unitRow, error: unitError } = await supabase
      .from("units")
      .select("id, grade_id")
      .eq("id", input.unit_id)
      .maybeSingle();
    if (unitError) return { success: false, error: unitError.message };
    if (!unitRow || unitRow.grade_id !== input.grade_id) {
      return { success: false, error: "الوحدة لا تتبع الصف المحدد" };
    }

    const payload = toTeacherResourceWritePayload({
      category: input.category,
      title: input.title_ar.trim(),
      file_url: input.url.trim(),
      description: input.description_ar?.trim() || null,
      grade_id: input.grade_id.trim(),
      unit_id: input.unit_id.trim(),
      is_active: input.is_active ?? true,
      is_coming_soon: input.is_coming_soon ?? false,
    });
    delete payload.order_index;

    const { data, error } = await updateFlexible<Record<string, unknown>>(
      TABLE,
      id,
      payload
    );
    if (error || !data) {
      console.error("[teacher-space] update:", error, payload);
      return { success: false, error: error ?? "فشل التحديث" };
    }

    revalidate();
    return {
      success: true,
      data: normalizeItem(data),
      message: "تم التحديث",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[teacher-space] update exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleTeacherSpaceActive(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase
      .from(TABLE)
      .update({ is_active })
      .eq("id", id);

    if (error) {
      console.error("[teacher-space] toggleActive:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return {
      success: true,
      message: is_active ? "تم التفعيل" : "تم الإيقاف",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[teacher-space] toggleActive exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleTeacherSpaceComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase
      .from(TABLE)
      .update({ is_coming_soon })
      .eq("id", id);

    if (error) {
      console.error("[teacher-space] toggleComingSoon:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return {
      success: true,
      message: is_coming_soon ? "تم تعليم العنصر كـ قريباً" : "تم إلغاء قريباً",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[teacher-space] toggleComingSoon exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteTeacherSpaceItem(
  id: string
): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      console.error("[teacher-space] delete:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return { success: true, message: "تم الحذف" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[teacher-space] delete exception:", err);
    return { success: false, error: message };
  }
}
