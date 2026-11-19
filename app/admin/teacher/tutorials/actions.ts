"use server";

import { revalidatePath } from "next/cache";
import { isValidYoutubeUrl } from "@/lib/academic";
import {
  arabicDbError,
  isMissingColumnError,
  requireUuid,
  toUuidOrNull,
} from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import type { ActionResult, TeacherTutorial } from "@/lib/types";

const PATH = "/admin/teacher/tutorials";

function normalize(row: Record<string, unknown>): TeacherTutorial {
  const cover = String(row.cover_image_url ?? "").trim();
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    youtube_url: String(row.youtube_url ?? "").trim(),
    cover_image_url: cover || null,
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export type TutorialInput = {
  title: string;
  youtube_url: string;
  cover_image_url?: string | null;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

function payload(input: TutorialInput) {
  const cover = String(input.cover_image_url ?? "").trim();
  return {
    title: input.title.trim(),
    youtube_url: input.youtube_url.trim(),
    cover_image_url: cover || null,
    stage_id: toUuidOrNull(input.stage_id),
    grade_id: toUuidOrNull(input.grade_id),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function persist(
  mode: "insert" | "update",
  input: TutorialInput,
  id?: string
): Promise<ActionResult<TeacherTutorial>> {
  const body = payload(input);
  if (!body.stage_id || !body.grade_id) {
    return {
      success: false,
      error: "يرجى اختيار المرحلة والصف قبل الحفظ.",
    };
  }

  const run = async (row: Record<string, unknown>) => {
    if (mode === "insert") {
      const counted = await supabase
        .from("teacher_tutorials")
        .select("*", { count: "exact", head: true });
      return supabase
        .from("teacher_tutorials")
        .insert({ ...row, sort_order: counted.count ?? 0 })
        .select("*")
        .single();
    }
    return supabase
      .from("teacher_tutorials")
      .update(row)
      .eq("id", id!)
      .select("*")
      .single();
  };

  let result = await run(body);

  if (
    result.error &&
    isMissingColumnError(result.error.message, "cover_image_url")
  ) {
    const { cover_image_url: _omit, ...rest } = body;
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
    message: mode === "insert" ? "تمت إضافة الشرح" : "تم تحديث الشرح",
  };
}

export async function getTutorials(): Promise<ActionResult<TeacherTutorial[]>> {
  const { data, error } = await supabase
    .from("teacher_tutorials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: arabicDbError(error.message) };
  return {
    success: true,
    data: (data ?? []).map((row) => normalize(row as Record<string, unknown>)),
  };
}

export async function createTutorial(input: TutorialInput) {
  if (!input.title.trim()) return { success: false as const, error: "العنوان مطلوب" };
  if (!isValidYoutubeUrl(input.youtube_url)) {
    return { success: false as const, error: "رابط يوتيوب غير صالح" };
  }
  return persist("insert", input);
}

export async function updateTutorial(id: string, input: TutorialInput) {
  const checked = requireUuid(id, "معرّف الشرح");
  if (!checked.ok) return { success: false as const, error: checked.error };
  if (!isValidYoutubeUrl(input.youtube_url)) {
    return { success: false as const, error: "رابط يوتيوب غير صالح" };
  }
  return persist("update", input, checked.id);
}

export async function toggleTutorialActive(id: string, is_active: boolean) {
  const checked = requireUuid(id, "معرّف الشرح");
  if (!checked.ok) return { success: false as const, error: checked.error };

  let result = await supabase
    .from("teacher_tutorials")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", checked.id)
    .select("*")
    .single();

  if (
    result.error &&
    isMissingColumnError(result.error.message, "updated_at")
  ) {
    result = await supabase
      .from("teacher_tutorials")
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
    message: is_active ? "تم تفعيل الشرح" : "تم إيقاف الشرح",
  };
}

export async function deleteTutorial(id: string) {
  const checked = requireUuid(id, "معرّف الشرح");
  if (!checked.ok) return { success: false as const, error: checked.error };
  const { error } = await supabase
    .from("teacher_tutorials")
    .delete()
    .eq("id", checked.id);
  if (error) return { success: false as const, error: arabicDbError(error.message) };
  revalidatePath(PATH);
  return { success: true as const, message: "تم حذف الشرح" };
}
