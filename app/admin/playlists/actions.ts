"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, VideoPlaylist } from "@/lib/types";

function normalizePlaylist(row: Record<string, unknown>): VideoPlaylist {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    youtube_url: String(row.youtube_url ?? ""),
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    unit_id: row.unit_id ? String(row.unit_id) : null,
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
      console.error("[playlists] getPlaylists:", error.message, error);
      return { success: false, error: error.message };
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
  youtube_url: string;
  stage_id: string;
  grade_id: string;
  unit_id: string;
  is_active: boolean;
};

function buildPayload(input: PlaylistInput) {
  return {
    title: input.title.trim(),
    youtube_url: input.youtube_url.trim(),
    stage_id: input.stage_id || null,
    grade_id: input.grade_id || null,
    unit_id: input.unit_id || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

export async function createPlaylist(
  input: PlaylistInput
): Promise<ActionResult<VideoPlaylist>> {
  try {
    if (!input.title.trim()) {
      return { success: false, error: "عنوان القائمة مطلوب" };
    }
    if (!input.youtube_url.trim()) {
      return { success: false, error: "رابط يوتيوب مطلوب" };
    }
    if (!input.stage_id || !input.grade_id || !input.unit_id) {
      return {
        success: false,
        error: "يجب اختيار المرحلة والصف والوحدة",
      };
    }

    const { count } = await supabase
      .from("video_playlists")
      .select("*", { count: "exact", head: true });

    const payload = {
      ...buildPayload(input),
      sort_order: count ?? 0,
    };

    const { data, error } = await supabase
      .from("video_playlists")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[playlists] createPlaylist:", error.message, {
        error,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizePlaylist(data as Record<string, unknown>),
      message: "تمت إضافة قائمة الفيديوهات",
    };
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
    if (!id) return { success: false, error: "معرّف القائمة غير صالح" };
    if (!input.title.trim()) {
      return { success: false, error: "عنوان القائمة مطلوب" };
    }
    if (!input.youtube_url.trim()) {
      return { success: false, error: "رابط يوتيوب مطلوب" };
    }
    if (!input.stage_id || !input.grade_id || !input.unit_id) {
      return {
        success: false,
        error: "يجب اختيار المرحلة والصف والوحدة",
      };
    }

    const payload = buildPayload(input);
    const { data, error } = await supabase
      .from("video_playlists")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[playlists] updatePlaylist:", error.message, {
        error,
        id,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizePlaylist(data as Record<string, unknown>),
      message: "تم تحديث قائمة الفيديوهات",
    };
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
    if (!id) return { success: false, error: "معرّف القائمة غير صالح" };
    const { data, error } = await supabase
      .from("video_playlists")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[playlists] togglePlaylistActive:", error.message, error);
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizePlaylist(data as Record<string, unknown>),
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
    if (!id) return { success: false, error: "معرّف القائمة غير صالح" };
    const { error } = await supabase
      .from("video_playlists")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[playlists] deletePlaylist:", error.message, { error, id });
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/playlists");
    return { success: true, message: "تم حذف القائمة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[playlists] deletePlaylist exception:", err);
    return { success: false, error: message };
  }
}