"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import {
  normalizeRelatedTitle,
  normalizeResourceRow,
  normalizeTitleFields,
} from "@/lib/schema-compat";
import type {
  ActionResult,
  TeacherSpaceCategory,
  TeacherSpaceItem,
} from "@/lib/types";

const TABLE = "teacher_resources";

const SELECT_CHAINS = [
  "id, category, title_ar, title_en, description_ar, url, grade_id, unit_id, is_active, is_coming_soon, sort_order, created_at, grades(id, title_ar), units(id, title_ar)",
  "id, category, title_ar, description_ar, url, grade_id, unit_id, is_coming_soon, created_at, grades(id, title_ar), units(id, title_ar)",
  "id, category, title, description_ar, file_url, url, grade_id, unit_id, is_coming_soon, created_at, grades(id, title), units(id, title)",
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
    description_ar: (base.description_ar as string | null) ?? null,
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
  const authError = await requireAuth<TeacherSpaceItem[]>();
  if (authError) return authError;

  let lastError: string | null = null;

  for (const select of SELECT_CHAINS) {
    let query = supabase.from(TABLE).select(select);
    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.grade_id) query = query.eq("grade_id", filters.grade_id);
    if (filters?.unit_id) query = query.eq("unit_id", filters.unit_id);

    const sorted = await query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!sorted.error) {
      return {
        success: true,
        data: ((sorted.data as unknown as Record<string, unknown>[]) ?? []).map(
          normalizeItem
        ),
      };
    }
    lastError = sorted.error.message;

    let plain = supabase.from(TABLE).select(select);
    if (filters?.category) plain = plain.eq("category", filters.category);
    if (filters?.grade_id) plain = plain.eq("grade_id", filters.grade_id);
    if (filters?.unit_id) plain = plain.eq("unit_id", filters.unit_id);

    const plainRes = await plain;
    if (!plainRes.error) {
      return {
        success: true,
        data: ((plainRes.data as unknown as Record<string, unknown>[]) ?? []).map(
          normalizeItem
        ),
      };
    }
    lastError = plainRes.error.message;
  }

  return { success: false, error: lastError ?? "فشل جلب موارد المعلم" };
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

  const payload = {
    category: input.category,
    title_ar: input.title_ar.trim(),
    title_en: "",
    description_ar: input.description_ar.trim() || null,
    url: input.url.trim(),
    grade_id: input.grade_id.trim(),
    unit_id: input.unit_id.trim(),
    is_active: input.is_active ?? true,
    is_coming_soon: input.is_coming_soon ?? false,
    sort_order: 0,
  };

  const { data, error } = await insertFlexible<Record<string, unknown>>(
    TABLE,
    payload
  );
  if (error || !data) return { success: false, error: error ?? "فشل الحفظ" };
  revalidate();
  return {
    success: true,
    data: normalizeItem(data),
    message: "تم إضافة المورد",
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
    is_active: boolean;
    is_coming_soon: boolean;
  }
): Promise<ActionResult<TeacherSpaceItem>> {
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

  const payload = {
    category: input.category,
    title_ar: input.title_ar.trim(),
    description_ar: input.description_ar.trim() || null,
    url: input.url.trim(),
    grade_id: input.grade_id.trim(),
    unit_id: input.unit_id.trim(),
    is_active: input.is_active ?? true,
    is_coming_soon: input.is_coming_soon ?? false,
  };

  const { data, error } = await updateFlexible<Record<string, unknown>>(
    TABLE,
    id,
    payload
  );
  if (error || !data) return { success: false, error: error ?? "فشل التحديث" };
  revalidate();
  return {
    success: true,
    data: normalizeItem(data),
    message: "تم التحديث",
  };
}

export async function toggleTeacherSpaceActive(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from(TABLE)
    .update({ is_active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    message: is_active ? "تم التفعيل" : "تم الإيقاف",
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
