"use server";

import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";

const BUCKET = "platform-assets";

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w.\u0600-\u06FF-]+/g, "")
    .slice(0, 120);
}

export async function uploadPlatformAsset(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  const authError = await requireAuth<{ url: string; path: string }>();
  if (authError) return authError;

  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "uploads");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "يرجى اختيار ملف صالح" };
  }

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  const base = sanitizeFileName(file.name.replace(ext, "")) || "file";
  const path = `${folder}/${Date.now()}-${base}${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) {
    return {
      success: false,
      error: `فشل رفع الملف: ${error.message}. تأكد من وجود bucket باسم platform-assets وأنه عام (public).`,
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    success: true,
    data: { url: data.publicUrl, path },
    message: "تم رفع الملف بنجاح",
  };
}
