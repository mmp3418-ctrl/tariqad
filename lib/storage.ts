import { supabase, supabaseUrl } from "@/lib/supabase";
import {
  MATERIALS_BUCKET,
  MATERIALS_BUCKET_FALLBACKS,
} from "@/lib/academic";
import type { ActionResult } from "@/lib/types";

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w.\-ء-ي]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function isBucketMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("bucket not found") ||
    m.includes("not found") ||
    m.includes("no such bucket") ||
    m.includes("does not exist")
  );
}

function publicUrlFor(bucket: string, objectPath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return (
    data?.publicUrl ||
    `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
  );
}

/**
 * Upload a PDF to storage.
 * Prefers `pdfs`, then falls back to `uploads` / legacy names if missing.
 */
export async function uploadMaterialPdf(
  file: File
): Promise<ActionResult<{ path: string; publicUrl: string; bucket: string }>> {
  try {
    if (!file) {
      return { success: false, error: "لم يتم اختيار ملف" };
    }

    const isPdfMime =
      !file.type ||
      file.type === "application/pdf" ||
      file.type === "application/x-pdf";
    const isPdfName = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !isPdfName) {
      return { success: false, error: "يجب رفع ملف PDF فقط" };
    }

    if (file.size <= 0) {
      return { success: false, error: "الملف فارغ — اختر ملف PDF صالحاً" };
    }
    if (file.size > 40 * 1024 * 1024) {
      return { success: false, error: "حجم الملف كبير جداً (الحد 40MB)" };
    }

    const stamp = Date.now();
    const safe = sanitizeFileName(file.name) || "material.pdf";
    const objectPath = `materials/${stamp}-${safe}`;

    const candidates = Array.from(
      new Set([MATERIALS_BUCKET, ...MATERIALS_BUCKET_FALLBACKS])
    );

    let lastError = "";
    const missing: string[] = [];

    for (const bucket of candidates) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/pdf",
        });

      if (!uploadError) {
        return {
          success: true,
          data: {
            path: objectPath,
            publicUrl: publicUrlFor(bucket, objectPath),
            bucket,
          },
          message: "تم رفع الملف بنجاح",
        };
      }

      const msg = uploadError.message || String(uploadError);
      console.error("[storage] uploadMaterialPdf:", bucket, msg, uploadError);
      lastError = msg;

      if (isBucketMissingError(msg)) {
        missing.push(bucket);
        continue;
      }

      if (
        msg.toLowerCase().includes("row-level security") ||
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("access denied")
      ) {
        return {
          success: false,
          error: "لا توجد صلاحية كافية لرفع الملف. يرجى التواصل مع مسؤول المنصة.",
        };
      }

      return {
        success: false,
        error: "تعذّر رفع الملف حالياً، يرجى المحاولة لاحقاً.",
      };
    }

    if (missing.length || lastError) {
      return {
        success: false,
        error: "تعذّر رفع الملف حالياً، يرجى المحاولة لاحقاً.",
      };
    }

    return {
      success: false,
      error: "تعذّر رفع الملف حالياً، يرجى المحاولة لاحقاً.",
    };
  } catch (err) {
    console.error("[storage] uploadMaterialPdf exception:", err);
    return {
      success: false,
      error: "تعذّر رفع الملف حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}

/**
 * Upload an optional playlist cover image.
 * Reuses the same public buckets as materials.
 */
export async function uploadPlaylistCover(
  file: File
): Promise<ActionResult<{ path: string; publicUrl: string; bucket: string }>> {
  try {
    if (!file) {
      return { success: false, error: "لم يتم اختيار صورة" };
    }

    const isImageMime = file.type.startsWith("image/");
    const isImageName = /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    if (!isImageMime && !isImageName) {
      return { success: false, error: "يجب رفع صورة (JPG / PNG / WebP)" };
    }

    if (file.size <= 0) {
      return { success: false, error: "الملف فارغ — اختر صورة صالحة" };
    }
    if (file.size > 8 * 1024 * 1024) {
      return { success: false, error: "حجم الصورة كبير جداً (الحد 8MB)" };
    }

    const stamp = Date.now();
    const safe = sanitizeFileName(file.name) || "cover.jpg";
    const objectPath = `covers/${stamp}-${safe}`;
    const contentType = file.type || "image/jpeg";

    const candidates = Array.from(
      new Set([MATERIALS_BUCKET, ...MATERIALS_BUCKET_FALLBACKS])
    );

    let lastError = "";
    const missing: string[] = [];

    for (const bucket of candidates) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType,
        });

      if (!uploadError) {
        return {
          success: true,
          data: {
            path: objectPath,
            publicUrl: publicUrlFor(bucket, objectPath),
            bucket,
          },
          message: "تم رفع الغلاف بنجاح",
        };
      }

      const msg = uploadError.message || String(uploadError);
      console.error("[storage] uploadPlaylistCover:", bucket, msg, uploadError);
      lastError = msg;

      if (isBucketMissingError(msg)) {
        missing.push(bucket);
        continue;
      }

      if (
        msg.toLowerCase().includes("row-level security") ||
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("access denied")
      ) {
        return {
          success: false,
          error: "لا توجد صلاحية كافية لرفع الصورة. يرجى التواصل مع مسؤول المنصة.",
        };
      }

      return {
        success: false,
        error: "تعذّر رفع الغلاف حالياً، يرجى المحاولة لاحقاً.",
      };
    }

    if (missing.length || lastError) {
      return {
        success: false,
        error: "تعذّر رفع الغلاف حالياً، يرجى المحاولة لاحقاً.",
      };
    }

    return {
      success: false,
      error: "تعذّر رفع الغلاف حالياً، يرجى المحاولة لاحقاً.",
    };
  } catch (err) {
    console.error("[storage] uploadPlaylistCover exception:", err);
    return {
      success: false,
      error: "تعذّر رفع الغلاف حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}
