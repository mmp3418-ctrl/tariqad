"use server";

import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/types";

/** Primary public bucket for PDFs / assets (per project config). */
const PRIMARY_BUCKET = "uploads";
/** Legacy fallback if older projects still use this name. */
const FALLBACK_BUCKET = "platform-assets";

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w.\u0600-\u06FF-]+/g, "")
    .slice(0, 120);
}

async function uploadToBucket(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<{ publicUrl: string } | { error: string }> {
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error(`[storage] upload to "${bucket}" failed:`, error.message);
    return { error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { error: `تعذر إنشاء الرابط العام من bucket "${bucket}"` };
  }

  console.info(`[storage] uploaded`, { bucket, path, url: data.publicUrl });
  return { publicUrl: data.publicUrl };
}

export async function uploadPlatformAsset(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string; file_url: string }>> {
  try {
    const authError = await requireAuth<{
      url: string;
      path: string;
      file_url: string;
    }>();
    if (authError) return authError;

    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "files").replace(
      /^\/+|\/+$/g,
      ""
    );

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "يرجى اختيار ملف صالح" };
    }

    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : "";
    const base = sanitizeFileName(file.name.replace(ext, "")) || "file";
    const path = `${folder || "files"}/${Date.now()}-${base}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    let result = await uploadToBucket(
      PRIMARY_BUCKET,
      path,
      buffer,
      contentType
    );

    if ("error" in result) {
      console.warn(
        `[storage] primary bucket "${PRIMARY_BUCKET}" failed, trying "${FALLBACK_BUCKET}"`
      );
      result = await uploadToBucket(FALLBACK_BUCKET, path, buffer, contentType);
    }

    if ("error" in result) {
      return {
        success: false,
        error: `فشل رفع الملف: ${result.error}. تأكد من وجود bucket عام باسم "${PRIMARY_BUCKET}".`,
      };
    }

    return {
      success: true,
      data: {
        url: result.publicUrl,
        file_url: result.publicUrl,
        path,
      },
      message: "تم رفع الملف بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[storage] exception:", err);
    return { success: false, error: `فشل رفع الملف: ${message}` };
  }
}
