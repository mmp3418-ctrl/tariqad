"use server";

import { revalidatePath } from "next/cache";
import {
  arabicDbError,
  isMissingColumnError,
  requireUuid,
  toUuidOrNull,
} from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import type { ActionResult, TeacherReference } from "@/lib/types";

const PATH = "/admin/teacher/references";

function normalize(row: Record<string, unknown>): TeacherReference {
  const description = String(row.description ?? "").trim();
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: description || null,
    file_url: String(row.file_url ?? "").trim(),
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export type ReferenceInput = {
  title: string;
  description?: string | null;
  file_url: string;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

function payload(input: ReferenceInput) {
  const description = String(input.description ?? "").trim();
  return {
    title: input.title.trim(),
    description: description || null,
    file_url: input.file_url.trim(),
    stage_id: toUuidOrNull(input.stage_id),
    grade_id: toUuidOrNull(input.grade_id),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function persist(
  mode: "insert" | "update",
  input: ReferenceInput,
  id?: string
): Promise<ActionResult<TeacherReference>> {
  const body = payload(input);
  if (!body.stage_id || !body.grade_id) {
    return {
      success: false,
      error: "يجب اختيار المرحلة والصف (معرّفات UUID صالحة)",
    };
  }

  const run = async (row: Record<string, unknown>) => {
    if (mode === "insert") {
      const counted = await supabase
        .from("teacher_references")
        .select("*", { count: "exact", head: true });
      return supabase
        .from("teacher_references")
        .insert({ ...row, sort_order: counted.count ?? 0 })
        .select("*")
        .single();
    }
    return supabase
      .from("teacher_references")
      .update(row)
      .eq("id", id!)
      .select("*")
      .single();
  };

  let result = await run(body);

  if (
    result.error &&
    isMissingColumnError(result.error.message, "description")
  ) {
    const { description: _omit, ...rest } = body;
    result = await run(rest);
  }

  if (
    result.error &&
    isMissingColumnError(result.error.message, "updated_at")
  ) {
    const { updated_at: _u, ...rest } = body;
    result = await run(rest);
  }

  if (result.error) {
    return { success: false, error: arabicDbError(result.error.message) };
  }
  revalidatePath(PATH);
  revalidatePath("/admin/teacher");
  return {
    success: true,
    data: normalize(result.data as Record<string, unknown>),
    message: mode === "insert" ? "تمت إضافة المرجع" : "تم تحديث المرجع",
  };
}

export async function getReferences(): Promise<
  ActionResult<TeacherReference[]>
> {
  const { data, error } = await supabase
    .from("teacher_references")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: arabicDbError(error.message) };
  return {
    success: true,
    data: (data ?? []).map((row) => normalize(row as Record<string, unknown>)),
  };
}

export async function createReference(input: ReferenceInput) {
  if (!input.title.trim()) return { success: false as const, error: "العنوان مطلوب" };
  if (!input.file_url.trim()) {
    return { success: false as const, error: "يجب رفع ملف PDF أولاً" };
  }
  return persist("insert", input);
}

export async function updateReference(id: string, input: ReferenceInput) {
  const checked = requireUuid(id, "معرّف المرجع");
  if (!checked.ok) return { success: false as const, error: checked.error };
  if (!input.file_url.trim()) {
    return { success: false as const, error: "يجب رفع ملف PDF أولاً" };
  }
  return persist("update", input, checked.id);
}

export async function toggleReferenceActive(id: string, is_active: boolean) {
  const checked = requireUuid(id, "معرّف المرجع");
  if (!checked.ok) return { success: false as const, error: checked.error };

  let result = await supabase
    .from("teacher_references")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", checked.id)
    .select("*")
    .single();

  if (
    result.error &&
    isMissingColumnError(result.error.message, "updated_at")
  ) {
    result = await supabase
      .from("teacher_references")
      .update({ is_active })
      .eq("id", checked.id)
      .select("*")
      .single();
  }

  if (result.error) {
    return { success: false as const, error: arabicDbError(result.error.message) };
  }
  revalidatePath(PATH);
  return {
    success: true as const,
    data: normalize(result.data as Record<string, unknown>),
    message: is_active ? "تم تفعيل المرجع" : "تم إيقاف المرجع",
  };
}

export async function deleteReference(id: string) {
  const checked = requireUuid(id, "معرّف المرجع");
  if (!checked.ok) return { success: false as const, error: checked.error };
  const { error } = await supabase
    .from("teacher_references")
    .delete()
    .eq("id", checked.id);
  if (error) return { success: false as const, error: arabicDbError(error.message) };
  revalidatePath(PATH);
  return { success: true as const, message: "تم حذف المرجع" };
}
