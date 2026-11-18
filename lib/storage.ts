import { supabase, supabaseUrl } from "@/lib/supabase";
import { MATERIALS_BUCKET } from "@/lib/academic";
import type { ActionResult } from "@/lib/types";

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w.\-ء-ي]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Upload a PDF to the public `materials` Storage bucket and return its public URL. */
export async function uploadMaterialPdf(
  file: File
): Promise<ActionResult<{ path: string; publicUrl: string }>> {
  try {
    if (!file) {
      return { success: false, error: "لم يتم اختيار ملف" };
    }
    if (file.type && file.type !== "application/pdf") {
      // Some browsers omit type — still allow .pdf extension
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return { success: false, error: "يجب رفع ملف PDF فقط" };
      }
    }
    if (file.size > 40 * 1024 * 1024) {
      return { success: false, error: "حجم الملف كبير جداً (الحد 40MB)" };
    }

    const stamp = Date.now();
    const safe = sanitizeFileName(file.name) || "material.pdf";
    const objectPath = `${stamp}-${safe}`;

    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error("[storage] uploadMaterialPdf:", uploadError.message, uploadError);
      return {
        success: false,
        error: `فشل رفع الملف: ${uploadError.message}`,
      };
    }

    const { data } = supabase.storage
      .from(MATERIALS_BUCKET)
      .getPublicUrl(objectPath);

    const publicUrl =
      data?.publicUrl ||
      `${supabaseUrl}/storage/v1/object/public/${MATERIALS_BUCKET}/${objectPath}`;

    return {
      success: true,
      data: { path: objectPath, publicUrl },
      message: "تم رفع الملف بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[storage] uploadMaterialPdf exception:", err);
    return { success: false, error: message };
  }
}