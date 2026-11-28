import { supabase, supabaseUrl } from "@/lib/supabase";
import {
  MATERIALS_BUCKET,
  MATERIALS_BUCKET_FALLBACKS,
} from "@/lib/academic";
import type { ActionResult } from "@/lib/types";

/**
 * Build a storage-safe ASCII object key segment.
 * Arabic / special chars in filenames commonly cause InvalidKey on Storage.
 */
function sanitizeFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const extMatch = name.match(/(\.[a-zA-Z0-9]{1,8})$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";

  const ascii = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${ascii || "file"}${ext}`;
}

function uniqueObjectPath(folder: string, originalName: string, forcedExt?: string) {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  let safe = sanitizeFileName(originalName);
  if (forcedExt) {
    safe = safe.replace(/\.[a-zA-Z0-9]+$/, "") + forcedExt;
  }
  return `${folder}/${stamp}-${rand}-${safe}`;
}

function isBucketMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("bucket not found") ||
    m.includes("no such bucket") ||
    (m.includes("not found") && m.includes("bucket")) ||
    m.includes("does not exist")
  );
}

function isRetryableAcrossBuckets(message: string): boolean {
  const m = message.toLowerCase();
  return (
    isBucketMissingError(m) ||
    m.includes("invalidkey") ||
    m.includes("invalid key") ||
    m.includes("invalid_key") ||
    m.includes("resource already exists") ||
    m.includes("duplicate") ||
    m.includes("already exists")
  );
}

function isPermissionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("row-level security") ||
    m.includes("unauthorized") ||
    m.includes("permission") ||
    m.includes("access denied") ||
    m.includes("jwt") ||
    m.includes("403")
  );
}

function publicUrlFor(bucket: string, objectPath: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return (
    data?.publicUrl ||
    `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
  );
}

function logStorageError(
  scope: string,
  bucket: string,
  path: string,
  uploadError: {
    message?: string;
    name?: string;
    statusCode?: string | number;
    error?: string;
  },
) {
  console.error(`[storage] ${scope}:`, {
    bucket,
    path,
    message: uploadError.message,
    name: uploadError.name,
    statusCode: uploadError.statusCode,
    error: uploadError.error,
    details: uploadError,
  });
}

/**
 * Upload a PDF to storage.
 * Prefers `pdfs`, then falls back to `uploads` / legacy names if missing.
 * Object keys are ASCII-only so Arabic filenames never break Storage.
 */
export async function uploadMaterialPdf(
  file: File,
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

    const candidates = Array.from(
      new Set([MATERIALS_BUCKET, ...MATERIALS_BUCKET_FALLBACKS]),
    );

    let lastError = "";
    const missing: string[] = [];

    for (const bucket of candidates) {
      // Fresh unique path per bucket attempt (avoids collisions / bad keys)
      const objectPath = uniqueObjectPath("materials", file.name, ".pdf");

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: true,
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
      logStorageError("uploadMaterialPdf", bucket, objectPath, uploadError);
      lastError = msg;

      if (isBucketMissingError(msg)) {
        missing.push(bucket);
        continue;
      }

      if (isPermissionError(msg)) {
        // Try next bucket — policies may differ
        continue;
      }

      if (isRetryableAcrossBuckets(msg)) {
        continue;
      }

      // Unknown hard failure — still try remaining buckets before giving up
      continue;
    }

    console.error("[storage] uploadMaterialPdf exhausted buckets:", {
      missing,
      lastError,
      candidates,
    });

    if (missing.length === candidates.length) {
      return {
        success: false,
        error:
          "تعذّر رفع الملف حالياً، يرجى المحاولة لاحقاً.",
      };
    }

    if (isPermissionError(lastError)) {
      return {
        success: false,
        error:
          "لا توجد صلاحية كافية لرفع الملف. يرجى التواصل مع مسؤول المنصة.",
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
  file: File,
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

    const contentType = file.type || "image/jpeg";
    const candidates = Array.from(
      new Set([MATERIALS_BUCKET, ...MATERIALS_BUCKET_FALLBACKS]),
    );

    let lastError = "";
    const missing: string[] = [];

    for (const bucket of candidates) {
      const objectPath = uniqueObjectPath("covers", file.name);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: true,
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
      logStorageError("uploadPlaylistCover", bucket, objectPath, uploadError);
      lastError = msg;

      if (isBucketMissingError(msg)) {
        missing.push(bucket);
        continue;
      }
      if (isPermissionError(msg) || isRetryableAcrossBuckets(msg)) {
        continue;
      }
      continue;
    }

    console.error("[storage] uploadPlaylistCover exhausted buckets:", {
      missing,
      lastError,
      candidates,
    });

    if (isPermissionError(lastError)) {
      return {
        success: false,
        error:
          "لا توجد صلاحية كافية لرفع الصورة. يرجى التواصل مع مسؤول المنصة.",
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
