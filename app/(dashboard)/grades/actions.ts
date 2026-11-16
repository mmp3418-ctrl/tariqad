"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { LIBYAN_GRADES_SEED, slugify } from "@/lib/constants";
import type { ActionResult, Grade, GradeStage } from "@/lib/types";

function revalidateGradePaths() {
  revalidatePath("/grades");
  revalidatePath("/units");
  revalidatePath("/notes");
  revalidatePath("/videos");
  revalidatePath("/teacher-space");
}

export async function getGrades(): Promise<ActionResult<Grade[]>> {
  const authError = await requireAuth<Grade[]>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as Grade[]) ?? [] };
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

  const { data, error } = await supabase
    .from("grades")
    .insert({
      stage: input.stage,
      title_ar,
      title_en,
      slug,
      sort_order,
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidateGradePaths();
  return {
    success: true,
    data: data as Grade,
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

  const { data, error } = await supabase
    .from("grades")
    .update({
      stage: input.stage,
      title_ar,
      title_en,
      slug: slugify(title_ar) || `grade-${id.slice(0, 8)}`,
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidateGradePaths();
  return {
    success: true,
    data: data as Grade,
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

  const { data, error } = await supabase
    .from("grades")
    .insert(LIBYAN_GRADES_SEED)
    .select();

  if (error) return { success: false, error: error.message };
  revalidateGradePaths();
  return {
    success: true,
    data: { count: data?.length ?? 0 },
    message: `تم تعبئة ${data?.length ?? 0} صف من المنهج الليبي`,
  };
}
