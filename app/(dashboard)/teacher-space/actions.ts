"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type {
  ActionResult,
  TeacherSpaceCategory,
  TeacherSpaceItem,
} from "@/lib/types";

const TABLE = "teacher_resources";
const SELECT_FULL =
  "id, category, title_ar, title_en, description_ar, url, grade_id, unit_id, is_active, is_coming_soon, sort_order, created_at, grades(id, title_ar), units(id, title_ar)";
const SELECT_SAFE =
  "id, category, title_ar, description_ar, url, grade_id, unit_id, is_coming_soon, created_at, grades(id, title_ar), units(id, title_ar)";

function revalidate() {
  revalidatePath("/teacher-space");
}

function normalizeItem(row: Record<string, unknown>): TeacherSpaceItem {
  return {
    id: String(row.id),
    category: row.category as TeacherSpaceCategory,
    title_ar: String(row.title_ar ?? ""),
    title_en: String(row.title_en ?? ""),
    description_ar: (row.description_ar as string | null) ?? null,
    url: String(row.url ?? ""),
    grade_id: (row.grade_id as string | null) ?? null,
    unit_id: (row.unit_id as string | null) ?? null,
    is_active: row.is_active !== false,
    is_coming_soon: Boolean(row.is_coming_soon),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    grades: (row.grades as TeacherSpaceItem["grades"]) ?? null,
    units: (row.units as TeacherSpaceItem["units"]) ?? null,
  };
}

export async function getTeacherSpaceItems(filters?: {
  category?: TeacherSpaceCategory;
  grade_id?: string;
  unit_id?: string;
}): Promise<ActionResult<TeacherSpaceItem[]>> {
  const authError = await requireAuth<TeacherSpaceItem[]>();
  if (authError) return authError;

  let full = supabase.from(TABLE).select(SELECT_FULL);
  if (filters?.category) full = full.eq("category", filters.category);
  if (filters?.grade_id) full = full.eq("grade_id", filters.grade_id);
  if (filters?.unit_id) full = full.eq("unit_id", filters.unit_id);

  const fullRes = await full
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!fullRes.error) {
    return {
      success: true,
      data: ((fullRes.data as Record<string, unknown>[]) ?? []).map(
        normalizeItem
      ),
    };
  }

  let safe = supabase.from(TABLE).select(SELECT_SAFE);
  if (filters?.category) safe = safe.eq("category", filters.category);
  if (filters?.grade_id) safe = safe.eq("grade_id", filters.grade_id);
  if (filters?.unit_id) safe = safe.eq("unit_id", filters.unit_id);

  const safeRes = await safe.order("created_at", { ascending: false });
  if (safeRes.error) return { success: false, error: safeRes.error.message };

  return {
    success: true,
    data: ((safeRes.data as Record<string, unknown>[]) ?? []).map(normalizeItem),
  };
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

  if (!input.grade_id || !input.unit_id) {
    return { success: false, error: "الصف والوحدة مطلوبان" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والملف أو الرابط مطلوبان" };
  }

  const payload = {
    category: input.category,
    title_ar: input.title_ar.trim(),
    title_en: "",
    description_ar: input.description_ar.trim() || null,
    url: input.url.trim(),
    grade_id: input.grade_id,
    unit_id: input.unit_id,
    is_active: input.is_active ?? true,
    is_coming_soon: input.is_coming_soon ?? false,
    sort_order: 0,
  };

  let result = await supabase
    .from(TABLE)
    .insert(payload)
    .select(SELECT_FULL)
    .single();

  if (result.error) {
    result = await supabase
      .from(TABLE)
      .insert(payload)
      .select(SELECT_SAFE)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidate();
  return {
    success: true,
    data: normalizeItem(result.data as Record<string, unknown>),
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

  if (!input.grade_id || !input.unit_id) {
    return { success: false, error: "الصف والوحدة مطلوبان" };
  }

  const payload = {
    category: input.category,
    title_ar: input.title_ar.trim(),
    description_ar: input.description_ar.trim() || null,
    url: input.url.trim(),
    grade_id: input.grade_id,
    unit_id: input.unit_id,
    is_active: input.is_active ?? true,
    is_coming_soon: input.is_coming_soon ?? false,
  };

  let result = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", id)
    .select(SELECT_FULL)
    .single();

  if (result.error) {
    result = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select(SELECT_SAFE)
      .single();
  }

  if (result.error) return { success: false, error: result.error.message };
  revalidate();
  return {
    success: true,
    data: normalizeItem(result.data as Record<string, unknown>),
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
