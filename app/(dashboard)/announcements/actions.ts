"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type {
  ActionResult,
  Announcement,
  AnnouncementKind,
} from "@/lib/types";

export async function getAnnouncements(): Promise<ActionResult<Announcement[]>> {
  const authError = await requireAuth<Announcement[]>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as Announcement[]) ?? [] };
}

export async function createAnnouncement(input: {
  message_ar: string;
  message_en: string;
  is_active: boolean;
  kind: AnnouncementKind;
}): Promise<ActionResult<Announcement>> {
  const authError = await requireAuth<Announcement>();
  if (authError) return authError;

  if (!input.message_ar.trim()) {
    return { success: false, error: "نص الإعلان بالعربية مطلوب" };
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      message_ar: input.message_ar.trim(),
      message_en: input.message_en.trim(),
      is_active: input.is_active,
      kind: input.kind,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/announcements");
  return {
    success: true,
    data: data as Announcement,
    message: "تم إضافة الإعلان بنجاح",
  };
}

export async function updateAnnouncement(
  id: string,
  input: {
    message_ar: string;
    message_en: string;
    is_active: boolean;
    kind: AnnouncementKind;
  }
): Promise<ActionResult<Announcement>> {
  const authError = await requireAuth<Announcement>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("announcements")
    .update({
      message_ar: input.message_ar.trim(),
      message_en: input.message_en.trim(),
      is_active: input.is_active,
      kind: input.kind,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/announcements");
  return {
    success: true,
    data: data as Announcement,
    message: "تم تحديث الإعلان",
  };
}

export async function toggleAnnouncement(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("announcements")
    .update({ is_active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/announcements");
  return {
    success: true,
    message: is_active ? "تم تفعيل الإعلان" : "تم إيقاف الإعلان",
  };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/announcements");
  return { success: true, message: "تم حذف الإعلان" };
}
