"use server";

import { revalidatePath } from "next/cache";
import { isMaterialType } from "@/lib/academic";
import {
  arabicDbError,
  isMissingColumnError,
  requireUuid,
  toUuidOrNull,
} from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import { logSupabaseError } from "@/lib/supabase-log";
import type {
  ActionResult,
  MaterialType,
  VideoPlaylist,
} from "@/lib/types";

function normalizePlaylist(row: Record<string, unknown>): VideoPlaylist {
  const rawType = String(row.material_type ?? "كتاب حصة");
  const material_type: MaterialType = isMaterialType(rawType)
    ? rawType
    : "كتاب حصة";

  const cover = String(row.cover_image_url ?? "").trim();

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    playlist_url: String(
      row.playlist_url ?? row.youtube_url ?? ""
    ).trim(),
    unit_name: String(row.unit_name ?? ""),
    material_type,
    cover_image_url: cover || null,
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    subject_id: row.subject_id ? String(row.subject_id) : null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getPlaylists(): Promise<ActionResult<VideoPlaylist[]>> {
  try {
    const { data, error } = await supabase
      .from("video_playlists")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseError("playlists.getPlaylists", error);
      return { success: false, error: arabicDbError(error.message) };
    }

    return {
      success: true,
      data: (data ?? []).map((r) =>
        normalizePlaylist(r as Record<string, unknown>)
      ),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[playlists] getPlaylists exception:", err);
    return { success: false, error: message };
  }
}

export type PlaylistInput = {
  title: string;
  /** Maps to DB column `playlist_url` */
  playlist_url: string;
  unit_name: string;
  material_type: MaterialType;
  /** Optional cover — empty string clears */
  cover_image_url?: string | null;
  stage_id: string;
  grade_id: string;
  subject_id: string;
  is_active: boolean;
};

/** Insertion object uses exact DB column names including optional cover_image_url. */
function buildPayload(input: PlaylistInput) {
  const playlist_url = input.playlist_url.trim();
  const cover = String(input.cover_image_url ?? "").trim();
  return {
    title: input.title.trim(),
    playlist_url,
    unit_name: input.unit_name.trim(),
    material_type: input.material_type,
    cover_image_url: cover || null,
    stage_id: toUuidOrNull(input.stage_id),
    grade_id: toUuidOrNull(input.grade_id),
    subject_id: toUuidOrNull(input.subject_id),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function persistPlaylist(
  mode: "insert" | "update",
  input: PlaylistInput,
  id?: string
): Promise<ActionResult<VideoPlaylist>> {
  const base = buildPayload(input);

  const run = async (body: Record<string, unknown>) => {
    if (mode === "insert") {
      const { count } = await supabase
        .from("video_playlists")
        .select("*", { count: "exact", head: true });
      return supabase
        .from("video_playlists")
        .insert({ ...body, sort_order: count ?? 0 })
        .select("*")
        .single();
    }
    return supabase
      .from("video_playlists")
      .update(body)
      .eq("id", id!)
      .select("*")
      .single();
  };

  let { data, error } = await run(base);

  if (
    error &&
    /subject_id/i.test(error.message) &&
    isMissingColumnError(error.message, "subject_id")
  ) {
    const { subject_id: _omit, ...withoutSubject } = base;
    const retry = await run(withoutSubject);
    data = retry.data;
    error = retry.error;
  }

  // Legacy tables without cover_image_url — retry without the column.
  if (
    error &&
    /cover_image_url/i.test(error.message) &&
    /(column|schema cache|does not exist)/i.test(error.message)
  ) {
    console.warn(
      "[playlists] cover_image_url missing — retry without cover column"
    );
    const { cover_image_url: _omit, ...withoutCover } = base;
    const retry = await run(withoutCover);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    logSupabaseError(`playlists.${mode}`, error, { id });
    return { success: false, error: arabicDbError(error.message) };
  }

  revalidatePath("/admin/playlists");
  return {
    success: true,
    data: normalizePlaylist(data as Record<string, unknown>),
    message:
      mode === "insert"
        ? "تمت إضافة قائمة التشغيل بنجاح"
        : "تم تحديث قائمة التشغيل بنجاح",
  };
}

export async function createPlaylist(
  input: PlaylistInput
): Promise<ActionResult<VideoPlaylist>> {
  try {
    if (!input.title.trim()) {
      return { success: false, error: "عنوان القائمة مطلوب" };
    }
    if (!input.playlist_url.trim()) {
      return {
        success: false,
        error: "رابط قائمة التشغيل مطلوب.",
      };
    }
    if (!input.unit_name.trim()) {
      return { success: false, error: "اسم الوحدة مطلوب" };
    }
    if (!isMaterialType(input.material_type)) {
      return { success: false, error: "نوع المادة غير صالح" };
    }
    if (!toUuidOrNull(input.stage_id) || !toUuidOrNull(input.grade_id)) {
      return {
        success: false,
        error: "يرجى اختيار المرحلة والصف قبل الحفظ.",
      };
    }
    if (!toUuidOrNull(input.subject_id)) {
      return {
        success: false,
        error: "يرجى اختيار المادة الدراسية قبل الحفظ.",
      };
    }

    console.info("[playlists] create payload:", {
      keys: Object.keys(buildPayload(input)),
      hasCover: Boolean(String(input.cover_image_url ?? "").trim()),
    });

    return await persistPlaylist("insert", input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[playlists] createPlaylist exception:", err);
    return { success: false, error: message };
  }
}

export async function updatePlaylist(
  id: string,
  input: PlaylistInput
): Promise<ActionResult<VideoPlaylist>> {
  try {
    const checked = requireUuid(id, "معرّف القائمة");
    if (!checked.ok) return { success: false, error: checked.error };
    if (!input.title.trim()) {
      return { success: false, error: "عنوان القائمة مطلوب" };
    }
    if (!input.playlist_url.trim()) {
      return {
        success: false,
        error: "رابط قائمة التشغيل مطلوب.",
      };
    }
    if (!input.unit_name.trim()) {
      return { success: false, error: "اسم الوحدة مطلوب" };
    }
    if (!isMaterialType(input.material_type)) {
      return { success: false, error: "نوع المادة غير صالح" };
    }
    if (!toUuidOrNull(input.stage_id) || !toUuidOrNull(input.grade_id)) {
      return {
        success: false,
        error: "يرجى اختيار المرحلة والصف قبل الحفظ.",
      };
    }
    if (!toUuidOrNull(input.subject_id)) {
      return {
        success: false,
        error: "يرجى اختيار المادة الدراسية قبل الحفظ.",
      };
    }

    return await persistPlaylist("update", input, checked.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[playlists] updatePlaylist exception:", err);
    return { success: false, error: message };
  }
}

export async function togglePlaylistActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<VideoPlaylist>> {
  try {
    const checked = requireUuid(id, "معرّف القائمة");
    if (!checked.ok) return { success: false, error: checked.error };

    let result = await supabase
      .from("video_playlists")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", checked.id)
      .select("*")
      .single();

    if (
      result.error &&
      isMissingColumnError(result.error.message, "updated_at")
    ) {
      result = await supabase
        .from("video_playlists")
        .update({ is_active })
        .eq("id", checked.id)
        .select("*")
        .single();
    }

    if (result.error) {
      console.error("[playlists] togglePlaylistActive:", result.error.message);
      return { success: false, error: arabicDbError(result.error.message) };
    }
    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizePlaylist(result.data as Record<string, unknown>),
      message: is_active ? "تم تفعيل القائمة" : "تم إيقاف القائمة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[playlists] togglePlaylistActive exception:", err);
    return { success: false, error: message };
  }
}

export async function deletePlaylist(id: string): Promise<ActionResult> {
  try {
    const checked = requireUuid(id, "معرّف القائمة");
    if (!checked.ok) return { success: false, error: checked.error };
    const { error } = await supabase
      .from("video_playlists")
      .delete()
      .eq("id", checked.id);
    if (error) {
      console.error("[playlists] deletePlaylist:", error.message, {
        error,
        id: checked.id,
      });
      return { success: false, error: arabicDbError(error.message) };
    }
    revalidatePath("/admin/playlists");
    return { success: true, message: "تم حذف القائمة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[playlists] deletePlaylist exception:", err);
    return { success: false, error: message };
  }
}
