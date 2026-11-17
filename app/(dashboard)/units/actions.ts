"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import {
  normalizeTitleFields,
  pickOrder,
  toUnitWritePayload,
} from "@/lib/schema-compat";
import type { ActionResult, Lesson, Unit, UnitWithLessons } from "@/lib/types";

const UNIT_SELECTS = [
  "id, grade_id, title, order_index, sort_order, is_coming_soon",
  "id, grade_id, title, order_index, is_coming_soon",
  "id, grade_id, title, sort_order, is_coming_soon",
  "id, grade_id, title, order_index",
  "id, grade_id, title",
  "id, grade_id, title_ar, sort_order, is_coming_soon",
  "id, grade_id, title_ar",
  "*",
];

const LESSON_SELECTS = [
  "id, unit_id, title, order_index, sort_order, is_coming_soon",
  "id, unit_id, title, order_index, is_coming_soon",
  "id, unit_id, title, sort_order, is_coming_soon",
  "id, unit_id, title, order_index",
  "id, unit_id, title",
  "id, unit_id, title_ar, sort_order, is_coming_soon",
  "id, unit_id, title_ar",
  "*",
];

function revalidate() {
  revalidatePath("/units");
  revalidatePath("/notes");
  revalidatePath("/videos");
  revalidatePath("/teacher-space");
}

function normalizeUnit(row: Record<string, unknown>): Unit {
  const titled = normalizeTitleFields(row);
  return {
    id: String(titled.id),
    grade_id: String(titled.grade_id),
    title_ar: titled.title_ar,
    title_en: titled.title_en,
    sort_order: pickOrder(titled),
    is_coming_soon: Boolean(titled.is_coming_soon),
  };
}

function normalizeLesson(row: Record<string, unknown>): Lesson {
  const titled = normalizeTitleFields(row);
  return {
    id: String(titled.id),
    unit_id: String(titled.unit_id),
    title_ar: titled.title_ar,
    title_en: titled.title_en,
    sort_order: pickOrder(titled),
    is_coming_soon: Boolean(titled.is_coming_soon),
  };
}

async function fetchUnits(gradeId: string) {
  for (const select of UNIT_SELECTS) {
    for (const orderKey of ["order_index", "sort_order"] as const) {
      const withSort = await supabase
        .from("units")
        .select(select)
        .eq("grade_id", gradeId)
        .order(orderKey, { ascending: true });
      if (!withSort.error) return withSort;
    }
    const bare = await supabase
      .from("units")
      .select(select)
      .eq("grade_id", gradeId);
    if (!bare.error) return bare;
  }
  return supabase.from("units").select("*").eq("grade_id", gradeId);
}

async function fetchLessons(unitIds: string[]) {
  for (const select of LESSON_SELECTS) {
    for (const orderKey of ["order_index", "sort_order"] as const) {
      const withSort = await supabase
        .from("lessons")
        .select(select)
        .in("unit_id", unitIds)
        .order(orderKey, { ascending: true });
      if (!withSort.error) return withSort;
    }
    const bare = await supabase
      .from("lessons")
      .select(select)
      .in("unit_id", unitIds);
    if (!bare.error) return bare;
  }
  return supabase.from("lessons").select("*").in("unit_id", unitIds);
}

async function nextUnitOrder(gradeId: string): Promise<number> {
  for (const key of ["order_index", "sort_order"] as const) {
    const { data, error } = await supabase
      .from("units")
      .select(key)
      .eq("grade_id", gradeId)
      .order(key, { ascending: false })
      .limit(1);
    if (!error) {
      const row = (data as Record<string, number>[] | null)?.[0];
      return (row?.[key] ?? 0) + 1;
    }
  }
  return 1;
}

async function nextLessonOrder(unitId: string): Promise<number> {
  for (const key of ["order_index", "sort_order"] as const) {
    const { data, error } = await supabase
      .from("lessons")
      .select(key)
      .eq("unit_id", unitId)
      .order(key, { ascending: false })
      .limit(1);
    if (!error) {
      const row = (data as Record<string, number>[] | null)?.[0];
      return (row?.[key] ?? 0) + 1;
    }
  }
  return 1;
}

export async function getUnitsByGrade(
  gradeId: string
): Promise<ActionResult<UnitWithLessons[]>> {
  try {
    const authError = await requireAuth<UnitWithLessons[]>();
    if (authError) return authError;

    const { data: units, error } = await fetchUnits(gradeId);
    if (error) {
      console.error("[units] getUnitsByGrade:", error.message);
      return { success: false, error: error.message };
    }

    const unitList = ((units as unknown as Record<string, unknown>[]) ?? []).map(
      normalizeUnit
    );
    if (unitList.length === 0) return { success: true, data: [] };

    const { data: lessons, error: lessonsError } = await fetchLessons(
      unitList.map((u) => u.id)
    );
    if (lessonsError) {
      console.error("[units] fetchLessons:", lessonsError.message);
      return { success: false, error: lessonsError.message };
    }

    const lessonList = (
      (lessons as unknown as Record<string, unknown>[]) ?? []
    ).map(normalizeLesson);

    return {
      success: true,
      data: unitList.map((unit) => ({
        ...unit,
        lessons: lessonList.filter((l) => l.unit_id === unit.id),
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[units] getUnitsByGrade exception:", err);
    return { success: false, error: message };
  }
}

export async function createUnit(input: {
  grade_id: string;
  title_ar: string;
  title_en?: string;
  is_coming_soon?: boolean;
}): Promise<ActionResult<Unit>> {
  try {
    const authError = await requireAuth<Unit>();
    if (authError) return authError;

    if (!input.grade_id || !input.title_ar.trim()) {
      return { success: false, error: "الصف وعنوان الوحدة مطلوبان" };
    }

    const order_index = await nextUnitOrder(input.grade_id);
    const payload = toUnitWritePayload({
      grade_id: input.grade_id,
      title: input.title_ar.trim(),
      order_index,
      is_coming_soon: input.is_coming_soon ?? false,
    });

    const { data, error } = await insertFlexible<Record<string, unknown>>(
      "units",
      payload
    );
    if (error || !data) {
      console.error("[units] createUnit:", error, payload);
      return { success: false, error: error ?? "فشل الحفظ" };
    }

    revalidate();
    return {
      success: true,
      data: normalizeUnit(data),
      message: "تم إضافة الوحدة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[units] createUnit exception:", err);
    return { success: false, error: message };
  }
}

export async function updateUnit(
  id: string,
  input: {
    title_ar: string;
    title_en?: string;
    is_coming_soon?: boolean;
  }
): Promise<ActionResult<Unit>> {
  try {
    const authError = await requireAuth<Unit>();
    if (authError) return authError;

    const payload = toUnitWritePayload({
      title: input.title_ar.trim(),
      is_coming_soon: input.is_coming_soon ?? false,
    });
    delete payload.order_index;

    const { data, error } = await updateFlexible<Record<string, unknown>>(
      "units",
      id,
      payload
    );
    if (error || !data) {
      console.error("[units] updateUnit:", error);
      return { success: false, error: error ?? "فشل التحديث" };
    }

    revalidate();
    return {
      success: true,
      data: normalizeUnit(data),
      message: "تم تحديث الوحدة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[units] updateUnit exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleUnitComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase
      .from("units")
      .update({ is_coming_soon })
      .eq("id", id);

    if (error) {
      console.error("[units] toggleComingSoon:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return {
      success: true,
      message: is_coming_soon ? "تم تعليم الوحدة كـ قريباً" : "تم إلغاء قريباً",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[units] toggleComingSoon exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) {
      console.error("[units] deleteUnit:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return { success: true, message: "تم حذف الوحدة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[units] deleteUnit exception:", err);
    return { success: false, error: message };
  }
}

export async function createLesson(input: {
  unit_id: string;
  title_ar: string;
  title_en?: string;
  is_coming_soon?: boolean;
}): Promise<ActionResult<Lesson>> {
  try {
    const authError = await requireAuth<Lesson>();
    if (authError) return authError;

    if (!input.unit_id || !input.title_ar.trim()) {
      return { success: false, error: "الوحدة وعنوان الدرس مطلوبان" };
    }

    const order_index = await nextLessonOrder(input.unit_id);
    const payload = toUnitWritePayload({
      unit_id: input.unit_id,
      title: input.title_ar.trim(),
      order_index,
      is_coming_soon: input.is_coming_soon ?? false,
    });

    const { data, error } = await insertFlexible<Record<string, unknown>>(
      "lessons",
      payload
    );
    if (error || !data) {
      console.error("[lessons] createLesson:", error, payload);
      return { success: false, error: error ?? "فشل الحفظ" };
    }

    revalidate();
    return {
      success: true,
      data: normalizeLesson(data),
      message: "تم إضافة الدرس",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lessons] createLesson exception:", err);
    return { success: false, error: message };
  }
}

export async function updateLesson(
  id: string,
  input: {
    title_ar: string;
    title_en?: string;
    is_coming_soon?: boolean;
  }
): Promise<ActionResult<Lesson>> {
  try {
    const authError = await requireAuth<Lesson>();
    if (authError) return authError;

    const payload = toUnitWritePayload({
      title: input.title_ar.trim(),
      is_coming_soon: input.is_coming_soon ?? false,
    });
    delete payload.order_index;

    const { data, error } = await updateFlexible<Record<string, unknown>>(
      "lessons",
      id,
      payload
    );
    if (error || !data) {
      console.error("[lessons] updateLesson:", error);
      return { success: false, error: error ?? "فشل التحديث" };
    }

    revalidate();
    return {
      success: true,
      data: normalizeLesson(data),
      message: "تم تحديث الدرس",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lessons] updateLesson exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleLessonComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase
      .from("lessons")
      .update({ is_coming_soon })
      .eq("id", id);

    if (error) {
      console.error("[lessons] toggleComingSoon:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return {
      success: true,
      message: is_coming_soon ? "تم تعليم الدرس كـ قريباً" : "تم إلغاء قريباً",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lessons] toggleComingSoon exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteLesson(id: string): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) {
      console.error("[lessons] deleteLesson:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return { success: true, message: "تم حذف الدرس" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lessons] deleteLesson exception:", err);
    return { success: false, error: message };
  }
}
