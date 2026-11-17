"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import { normalizeTitleFields } from "@/lib/schema-compat";
import { LIBYAN_GRADES_SEED, slugify } from "@/lib/constants";
import type { ActionResult, Grade, GradeStage } from "@/lib/types";

function revalidateGradePaths() {
  revalidatePath("/grades");
  revalidatePath("/units");
  revalidatePath("/notes");
  revalidatePath("/videos");
  revalidatePath("/teacher-space");
}

function normalizeGrade(row: Record<string, unknown>): Grade {
  const titled = normalizeTitleFields(row);
  return {
    id: String(titled.id),
    stage: titled.stage as GradeStage,
    title_ar: titled.title_ar,
    title_en: titled.title_en,
    slug: String(titled.slug ?? titled.title_ar ?? titled.id),
    sort_order: Number(titled.sort_order ?? 0),
    is_coming_soon: Boolean(titled.is_coming_soon),
  };
}

export async function getGrades(): Promise<ActionResult<Grade[]>> {
  const authError = await requireAuth<Grade[]>();
  if (authError) return authError;

  const ordered = await supabase
    .from("grades")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!ordered.error) {
    return {
      success: true,
      data: ((ordered.data as Record<string, unknown>[]) ?? []).map(
        normalizeGrade
      ),
    };
  }

  // sort_order may be missing — fall back to unordered *
  const bare = await supabase.from("grades").select("*");
  if (bare.error) return { success: false, error: bare.error.message };

  return {
    success: true,
    data: ((bare.data as Record<string, unknown>[]) ?? []).map(normalizeGrade),
  };
}

async function nextSortOrder(): Promise<number> {
  const { data } = await supabase
    .from("grades")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const max = (data as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0;
  return max + 1;
}

export async function createGrade(input: {
  stage: GradeStage;
  title_ar: string;
  title_en?: string;
  is_coming_soon?: boolean;
}): Promise<ActionResult<Grade>> {
  const authError = await requireAuth<Grade>();
  if (authError) return authError;

  if (!input.title_ar.trim()) {
    return { success: false, error: "اسم الصف مطلوب" };
  }

  const title_ar = input.title_ar.trim();
  const title_en = (input.title_en || title_ar).trim();
  const slug = `${slugify(title_ar)}-${Date.now().toString(36)}`;
  const sort_order = await nextSortOrder();

  const { data, error } = await insertFlexible<Record<string, unknown>>(
    "grades",
    {
      stage: input.stage,
      title_ar,
      title_en,
      slug,
      sort_order,
      is_coming_soon: input.is_coming_soon ?? false,
    }
  );

  if (error || !data) return { success: false, error: error ?? "فشل الحفظ" };
  revalidateGradePaths();
  return {
    success: true,
    data: normalizeGrade(data),
    message: "تم إضافة الصف بنجاح",
  };
}

export async function updateGrade(
  id: string,
  input: {
    stage: GradeStage;
    title_ar: string;
    title_en?: string;
    is_coming_soon?: boolean;
  }
): Promise<ActionResult<Grade>> {
  const authError = await requireAuth<Grade>();
  if (authError) return authError;

  if (!input.title_ar.trim()) {
    return { success: false, error: "اسم الصف مطلوب" };
  }

  const title_ar = input.title_ar.trim();
  const title_en = (input.title_en || title_ar).trim();

  const { data, error } = await updateFlexible<Record<string, unknown>>(
    "grades",
    id,
    {
      stage: input.stage,
      title_ar,
      title_en,
      slug: slugify(title_ar) || `grade-${id.slice(0, 8)}`,
      is_coming_soon: input.is_coming_soon ?? false,
    }
  );

  if (error || !data) return { success: false, error: error ?? "فشل التحديث" };
  revalidateGradePaths();
  return {
    success: true,
    data: normalizeGrade(data),
    message: "تم تحديث الصف بنجاح",
  };
}

export async function toggleGradeComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("grades")
    .update({ is_coming_soon })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidateGradePaths();
  return {
    success: true,
    message: is_coming_soon ? "تم تعليم الصف كـ قريباً" : "تم إلغاء قريباً",
  };
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateGradePaths();
  return { success: true, message: "تم حذف الصف" };
}

export async function seedLibyanGrades(): Promise<
  ActionResult<{ count: number }>
> {
  const authError = await requireAuth<{ count: number }>();
  if (authError) return authError;

  const { count, error: countError } = await supabase
    .from("grades")
    .select("*", { count: "exact", head: true });

  if (countError) return { success: false, error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      success: false,
      error: "الجدول يحتوي على صفوف بالفعل. احذفها أولاً إن أردت إعادة التعبئة.",
    };
  }

  let inserted = 0;
  for (const seed of LIBYAN_GRADES_SEED) {
    const { error } = await insertFlexible("grades", { ...seed });
    if (error) return { success: false, error };
    inserted += 1;
  }

  revalidateGradePaths();
  return {
    success: true,
    data: { count: inserted },
    message: `تم تعبئة ${inserted} صف من المنهج الليبي`,
  };
}
