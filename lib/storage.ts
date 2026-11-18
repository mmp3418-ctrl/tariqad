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
 * Upload a PDF to Supabase Storage.
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
          message: `تم رفع الملف بنجاح إلى «${bucket}»`,
        };
      }

      const msg = uploadError.message || String(uploadError);
      console.error("[storage] uploadMaterialPdf:", bucket, msg, uploadError);
      lastError = msg;

      if (isBucketMissingError(msg)) {
        missing.push(bucket);
        continue;
      }

      // Non-bucket errors (RLS, size, mime) — stop and surface clearly
      if (
        msg.toLowerCase().includes("row-level security") ||
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("access denied")
      ) {
        return {
          success: false,
          error:
            "لا توجد صلاحية للرفع إلى التخزين. أضف سياسة Upload للـ bucket في Supabase Storage.",
        };
      }

      return {
        success: false,
        error: `فشل رفع الملف: ${msg}`,
      };
    }

    if (missing.length) {
      return {
        success: false,
        error: `لم يتم العثور على مجلد التخزين (${missing.join(
          " / "
        )}). أنشئ bucket باسم «pdfs» (عام/public) من لوحة Supabase → Storage ثم أعد المحاولة.`,
      };
    }

    return {
      success: false,
      error: lastError
        ? `فشل رفع الملف: ${lastError}`
        : "فشل رفع الملف لأسباب غير معروفة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[storage] uploadMaterialPdf exception:", err);
    return {
      success: false,
      error: `حدث خطأ أثناء الرفع: ${message}`,
    };
  }
}