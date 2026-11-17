"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { TEACHER_RESOURCE_PRESETS } from "@/lib/constants";
import type {
  ActionResult,
  TeacherSpaceCategory,
  TeacherSpaceItem,
} from "@/lib/types";

const TABLE = "teacher_resources";
const SELECT =
  "id, category, title_ar, title_en, description_ar, url, grade_id, unit_id, is_active, is_coming_soon, sort_order, created_at, grades(id, title_ar), units(id, title_ar)";

function revalidate() {
  revalidatePath("/teacher-space");
}

/** Ensure the five fixed preset tools exist (no admin "add" flow). */
export async function ensureTeacherResourcePresets(): Promise<
  ActionResult<TeacherSpaceItem[]>
> {
  const authError = await requireAuth<TeacherSpaceItem[]>();
  if (authError) return authError;

  const { data: existing, error: listError } = await supabase
    .from(TABLE)
    .select("category")
    .in(
      "category",
      TEACHER_RESOURCE_PRESETS.map((p) => p.category)
    );

  if (listError) return { success: false, error: listError.message };

  const have = new Set(
    ((existing as { category: string }[]) ?? []).map((r) => r.category)
  );
  const missing = TEACHER_RESOURCE_PRESETS.filter((p) => !have.has(p.category));

  if (missing.length > 0) {
    const { error: insertError } = await supabase.from(TABLE).insert(
      missing.map((p) => ({
        category: p.category,
        title_ar: p.title_ar,
        title_en: p.title_en,
        description_ar: null,
        url: p.url,
        grade_id: null,
        unit_id: null,
        is_active: true,
        is_coming_soon: false,
        sort_order: p.sort_order,
      }))
    );
    if (insertError) return { success: false, error: insertError.message };
  }

  return getTeacherSpaceItems();
}

export async function getTeacherSpaceItems(filters?: {
  category?: TeacherSpaceCategory;
}): Promise<ActionResult<TeacherSpaceItem[]>> {
  const authError = await requireAuth<TeacherSpaceItem[]>();
  if (authError) return authError;

  let query = supabase
    .from(TABLE)
    .select(SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data as unknown as TeacherSpaceItem[]) ?? [],
  };
}

export async function updateTeacherSpaceItem(
  id: string,
  input: {
    title_ar: string;
    title_en?: string;
    description_ar: string;
    url: string;
  }
): Promise<ActionResult<TeacherSpaceItem>> {
  const authError = await requireAuth<TeacherSpaceItem>();
  if (authError) return authError;

  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط مطلوبان" };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      title_ar: input.title_ar.trim(),
      title_en: input.title_en?.trim() || "",
      description_ar: input.description_ar.trim() || null,
      url: input.url.trim(),
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
