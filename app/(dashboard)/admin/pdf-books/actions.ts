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
  PdfBook,
  PdfBookCategory,
  QuestionData,
  TargetAudience,
} from "@/lib/types";

const SELECT_CHAINS = [
  "*, grades(id, title, stage), units(id, title)",
  "*, grades(id, title_ar, stage), units(id, title_ar)",
  "*, grades(*), units(*)",
  "*",
];

function revalidate() {
  revalidatePath("/admin/pdf-books");
  revalidatePath("/units");
  revalidatePath("/notes");
  revalidatePath("/teacher-space");
}

function normalizePdfBook(row: Record<string, unknown>): PdfBook {
  const base = normalizeResourceRow(row);
  const grades = normalizeRelatedTitle(row.grades);
  const units = normalizeRelatedTitle(row.units);

  return {
    id: String(base.id),
    grade_id: String(base.grade_id ?? ""),
    unit_id: (base.unit_id as string | null) ?? null,
    lesson_id: (base.lesson_id as string | null) ?? null,
    type: "pdf",
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
      (base.resource_category as PdfBook["resource_category"]) ?? null,
    target_audience: (base.target_audience as TargetAudience | null) ?? null,
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
    lessons: null,
  };
}

export type PdfBookInput = {
  grade_id: string;
  unit_id: string;
  title_ar: string;
  file_url: string;
  description_ar: string;
  target_audience: TargetAudience;
  resource_category: PdfBookCategory | "";
  question_data: QuestionData | null;
  is_coming_soon: boolean;
};

function buildPayload(input: PdfBookInput) {
  const isQuestionBank =
    input.target_audience === "teacher" &&
    input.resource_category === "question_banks";

  const fileUrl = isQuestionBank
    ? input.file_url.trim() || "inline-question"
    : input.file_url.trim();

  return toResourceWritePayload({
    grade_id: input.grade_id,
    unit_id:
      input.target_audience === "student"
        ? input.unit_id.trim() || null
        : input.unit_id.trim() || null,
    lesson_id: null,
    type: "pdf",
    title: input.title_ar.trim(),
    file_url: fileUrl,
    description: input.description_ar?.trim() || null,
    resource_category: input.resource_category || null,
    target_audience: input.target_audience,
    question_data: isQuestionBank ? input.question_data : null,
    is_coming_soon: input.is_coming_soon ?? false,
  });
}

export async function getPdfBooks(): Promise<ActionResult<PdfBook[]>> {
  try {
    const authError = await requireAuth<PdfBook[]>();
    if (authError) return authError;

    let lastError: string | null = null;

    for (const select of SELECT_CHAINS) {
      for (const orderKey of ["order_index", "title", "title_ar", "created_at"] as const) {
        const ordered = await supabase
          .from("resources")
          .select(select)
          .eq("type", "pdf")
          .order(orderKey, { ascending: true });

        if (!ordered.error) {
          return {
            success: true,
            data: (
              (ordered.data as unknown as Record<string, unknown>[]) ?? []
            ).map(normalizePdfBook),
          };
        }
        lastError = ordered.error.message;
      }

      const plain = await supabase
        .from("resources")
        .select(select)
        .eq("type", "pdf");
      if (!plain.error) {
        return {
          success: true,
          data: ((plain.data as unknown as Record<string, unknown>[]) ?? []).map(
            normalizePdfBook
          ),
        };
      }
      lastError = plain.error.message;
    }

    console.error("[pdf-books] getPdfBooks:", lastError);
    return { success: false, error: lastError ?? "فشل جلب المستندات" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pdf-books] getPdfBooks exception:", err);
    return { success: false, error: message };
  }
}

export async function createPdfBook(
  input: PdfBookInput
): Promise<ActionResult<PdfBook>> {
  try {
    const authError = await requireAuth<PdfBook>();
    if (authError) return authError;

    if (!input.grade_id?.trim()) {
      return { success: false, error: "يجب اختيار الصف الدراسي" };
    }
    if (!input.target_audience) {
      return { success: false, error: "يجب اختيار الفئة المستهدفة" };
    }
    if (!input.title_ar.trim()) {
      return { success: false, error: "العنوان مطلوب" };
    }
    if (!input.resource_category) {
      return { success: false, error: "يجب اختيار التصنيف" };
    }

    const isQuestionBank =
      input.target_audience === "teacher" &&
      input.resource_category === "question_banks";

    if (input.target_audience === "student" && !input.unit_id?.trim()) {
      return { success: false, error: "يجب ربط المستند بوحدة / مادة" };
    }

    if (!isQuestionBank && !input.file_url.trim()) {
      return { success: false, error: "يجب رفع ملف PDF أو إدخال رابط" };
    }

    if (isQuestionBank) {
      const q = input.question_data;
      if (!q?.question_text?.trim()) {
        return { success: false, error: "نص السؤال مطلوب" };
      }
      if (q.options.some((o) => !o.trim())) {
        return { success: false, error: "يجب تعبئة جميع خيارات الإجابة" };
      }
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
      console.error("[pdf-books] createPdfBook:", error, payload);
      return { success: false, error: error ?? "فشل الحفظ" };
    }

    revalidate();
    return {
      success: true,
      data: normalizePdfBook(data),
      message: "تم حفظ المستند بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pdf-books] createPdfBook exception:", err);
    return { success: false, error: message };
  }
}

export async function updatePdfBook(
  id: string,
  input: PdfBookInput
): Promise<ActionResult<PdfBook>> {
  try {
    const authError = await requireAuth<PdfBook>();
    if (authError) return authError;

    if (!input.grade_id?.trim() || !input.title_ar.trim()) {
      return { success: false, error: "الحقول الأساسية مطلوبة" };
    }
    if (!input.resource_category) {
      return { success: false, error: "يجب اختيار التصنيف" };
    }

    const isQuestionBank =
      input.target_audience === "teacher" &&
      input.resource_category === "question_banks";

    if (input.target_audience === "student" && !input.unit_id?.trim()) {
      return { success: false, error: "يجب ربط المستند بوحدة / مادة" };
    }
    if (!isQuestionBank && !input.file_url.trim()) {
      return { success: false, error: "يجب رفع ملف PDF أو إدخال رابط" };
    }
    if (isQuestionBank) {
      const q = input.question_data;
      if (!q?.question_text?.trim()) {
        return { success: false, error: "نص السؤال مطلوب" };
      }
      if (q.options.some((o) => !o.trim())) {
        return { success: false, error: "يجب تعبئة جميع خيارات الإجابة" };
      }
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
      console.error("[pdf-books] updatePdfBook:", error, payload);
      return { success: false, error: error ?? "فشل التحديث" };
    }

    revalidate();
    return {
      success: true,
      data: normalizePdfBook(data),
      message: "تم تحديث المستند بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pdf-books] updatePdfBook exception:", err);
    return { success: false, error: message };
  }
}

export async function deletePdfBook(id: string): Promise<ActionResult> {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      console.error("[pdf-books] deletePdfBook:", error.message);
      return { success: false, error: error.message };
    }
    revalidate();
    return { success: true, message: "تم الحذف" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pdf-books] deletePdfBook exception:", err);
    return { success: false, error: message };
  }
}
