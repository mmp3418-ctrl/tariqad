"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { LIBYAN_GRADES_SEED, slugify } from "@/lib/constants";
import type { ActionResult, Grade, GradeStage } from "@/lib/types";

export async function getGrades(): Promise<ActionResult<Grade[]>> {
  const authError = await requireAuth<Grade[]>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as Grade[]) ?? [] };
}

export async function createGrade(input: {
  stage: GradeStage;
  title_ar: string;
  title_en: string;
  slug: string;
  sort_order: number;
}): Promise<ActionResult<Grade>> {
  const authError = await requireAuth<Grade>();
  if (authError) return authError;

  if (!input.title_ar.trim()) {
    return { success: false, error: "العنوان بالعربية مطلوب" };
  }

  const slug = (
    input.slug.trim() || slugify(input.title_en || input.title_ar)
  ).toLowerCase();

  const { data, error } = await supabase
    .from("grades")
    .insert({
      stage: input.stage,
      title_ar: input.title_ar.trim(),
      title_en: input.title_en.trim(),
      slug,
      sort_order: Number(input.sort_order) || 0,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/grades");
  revalidatePath("/resources");
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
    title_en: string;
    slug: string;
    sort_order: number;
  }
): Promise<ActionResult<Grade>> {
  const authError = await requireAuth<Grade>();
  if (authError) return authError;

  if (!input.title_ar.trim()) {
    return { success: false, error: "العنوان بالعربية مطلوب" };
  }

  const slug = (
    input.slug.trim() || slugify(input.title_en || input.title_ar)
  ).toLowerCase();

  const { data, error } = await supabase
    .from("grades")
    .update({
      stage: input.stage,
      title_ar: input.title_ar.trim(),
      title_en: input.title_en.trim(),
      slug,
      sort_order: Number(input.sort_order) || 0,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/grades");
  revalidatePath("/resources");
  return {
    success: true,
    data: data as Grade,
    message: "تم تحديث الصف بنجاح",
  };
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("grades").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/grades");
  revalidatePath("/resources");
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

  if (countError) {
    return { success: false, error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error:
        "الجدول يحتوي على صفوف بالفعل. احذفها أولاً إن أردت إعادة التعبئة.",
    };
  }

  const { data, error } = await supabase
    .from("grades")
    .insert(LIBYAN_GRADES_SEED)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  const rows = (data as Grade[]) ?? [];
  revalidatePath("/grades");
  revalidatePath("/resources");
  return {
    success: true,
    data: { count: rows.length },
    message: `تم تعبئة ${rows.length} صف من المنهج الليبي الافتراضي`,
  };
}
