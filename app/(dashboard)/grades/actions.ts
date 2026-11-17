"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import {
  normalizeTitleFields,
  pickOrder,
  toGradeWritePayload,
} from "@/lib/schema-compat";
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
    sort_order: pickOrder(titled),
    is_coming_soon: Boolean(titled.is_coming_soon),
  };
}

export async function getGrades(): Promise<ActionResult<Grade[]>> {
  try {
    const authError = await requireAuth<Grade[]>();
    if (authError) return authError;

    for (const orderKey of ["order_index", "sort_order"] as const) {
      const ordered = await supabase
        .from("grades")
        .select("*")
        .order(orderKey, { ascending: true });
      if (!ordered.error) {
        return {
          success: true,
          data: ((ordered.data as Record<string, unknown>[]) ?? []).map(
            normalizeGrade
          ),
        };
      }
    }

    const bare = await supabase.from("grades").select("*");
    if (bare.error) {
      console.error("[grades] getGrades:", bare.error.message);
      return { success: false, error: bare.error.message };
    }

    return {
      success: true,
      data: ((bare.data as Record<string, unknown>[]) ?? []).map(normalizeGrade),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grades] getGrades exception:", err);
    return { success: false, error: message };
  }
}

async function nextOrderIndex(): Promise<number> {
  for (const key of ["order_index", "sort_order"] as const) {
    const { data, error } = await supabase
      .from("grades")
      .select(key)
      .order(key, { ascending: false })
      .limit(1);
    if (!error) {
      const row = (data as Record<string, number>[] | null)?.[0];
      return (row?.[key] ?? 0) + 1;
    }
  }
  return 1;
}

export async function createGrade(input: {
  stage: GradeStage;
  title_ar: string;
  title_en?: string;
  is_coming_soon?: boolean;
}): Promise<ActionResult<Grade>> {
  try {
    const authError = await requireAuth<Grade>();
    if (authError) return authError;

    if (!input.title_ar.trim()) {
      return { success: false, error: "اسم الصف مطلوب" };
    }

    const title = input.title_ar.trim();
    const order_index = await nextOrderIndex();
    const payload = toGradeWritePayload({
      stage: input.stage,
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      order_index,
      is_coming_soon: input.is_coming_soon ?? false,
    });

    const { data, error } = await insertFlexible<Record<string, unknown>>(
      "grades",
      payload
    );

    if (error || !data) {
      console.error("[grades] createGrade:", error);
      return { success: false, error: error ?? "فشل الحفظ" };
    }

    revalidateGradePaths();
    return {
      success: true,
      data: normalizeGrade(data),
      message: "تم إضافة الصف بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grades] createGrade exception:", err);
    return { success: false, error: message };
  }
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
  try {
    const authError = await requireAuth<Grade>();
    if (authError) return authError;

    if (!input.title_ar.trim()) {
      return { success: false, error: "اسم الصف مطلوب" };
    }

    const title = input.title_ar.trim();
    const payload = toGradeWritePayload({
      stage: input.stage,
      title,
      slug: slugify(title) || `grade-${id.slice(0, 8)}`,
      is_coming_soon: input.is_coming_soon ?? false,
    });
    // Don't overwrite order on edit
    delete payload.order_index;

    const { data, error } = await updateFlexible<Record<string, unknown>>(
      "grades",
      id,
      payload
    );

    if (error || !data) {
      console.error("[grades] updateGrade:", error);
      return { success: false, error: error ?? "فشل التحديث" };
    }

    revalidateGradePaths();
    return {
      success: true,
      data: normalizeGrade(data),
      message: "تم تحديث الصف بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grades] updateGrade exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleGradeComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase
      .from("grades")
      .update({ is_coming_soon })
      .eq("id", id);

    if (error) {
      console.error("[grades] toggleComingSoon:", error.message);
      return { success: false, error: error.message };
    }
    revalidateGradePaths();
    return {
      success: true,
      message: is_coming_soon ? "تم تعليم الصف كـ قريباً" : "تم إلغاء قريباً",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grades] toggleComingSoon exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase.from("grades").delete().eq("id", id);
    if (error) {
      console.error("[grades] deleteGrade:", error.message);
      return { success: false, error: error.message };
    }
    revalidateGradePaths();
    return { success: true, message: "تم حذف الصف" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grades] deleteGrade exception:", err);
    return { success: false, error: message };
  }
}

export async function seedLibyanGrades(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const authError = await requireAuth<{ count: number }>();
    if (authError) return authError;

    const { count, error: countError } = await supabase
      .from("grades")
      .select("*", { count: "exact", head: true });

    if (countError) return { success: false, error: countError.message };
    if ((count ?? 0) > 0) {
      return {
        success: false,
        error:
          "الجدول يحتوي على صفوف بالفعل. احذفها أولاً إن أردت إعادة التعبئة.",
      };
    }

    let inserted = 0;
    for (const seed of LIBYAN_GRADES_SEED) {
      const payload = toGradeWritePayload({
        stage: seed.stage,
        title: seed.title_ar,
        slug: seed.slug,
        order_index: seed.sort_order,
        is_coming_soon: seed.is_coming_soon,
      });
      const { error } = await insertFlexible("grades", payload);
      if (error) {
        console.error("[grades] seed item failed:", error, payload);
        return { success: false, error };
      }
      inserted += 1;
    }

    revalidateGradePaths();
    return {
      success: true,
      data: { count: inserted },
      message: `تم تعبئة ${inserted} صف من المنهج الليبي`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grades] seedLibyanGrades exception:", err);
    return { success: false, error: message };
  }
}
