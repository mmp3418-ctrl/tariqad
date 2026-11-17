"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, SiteSettings, SocialLink } from "@/lib/types";

const BASE_SELECT =
  "id, logo_url, phone_number, whatsapp_number, telegram_link, social_links, hero_subtitle_ar, hero_subtitle_en, book_year_label, updated_at";

const FULL_SELECT = `${BASE_SELECT}, schedules_enabled, grade_calculator_enabled`;

const MISSING_FLAGS_HINT =
  "أعمدة الميزات غير موجودة في قاعدة البيانات. شغّل ملف supabase/fix_missing_columns.sql";

function isMissingColumnError(message: string, column?: string): boolean {
  const lower = message.toLowerCase();
  if (!lower.includes("column") && !lower.includes("does not exist") && !lower.includes("schema cache")) {
    return false;
  }
  if (!column) return true;
  return lower.includes(column.toLowerCase());
}

function normalizeSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is SocialLink =>
        !!item &&
        typeof item === "object" &&
        typeof (item as SocialLink).id === "string" &&
        typeof (item as SocialLink).platform === "string" &&
        typeof (item as SocialLink).url === "string"
    )
    .map((item) => ({
      id: item.id,
      platform: item.platform.trim(),
      url: item.url.trim(),
      icon: item.icon || "globe",
      custom_icon_url: item.custom_icon_url || null,
    }));
}

function toPublic(row: Record<string, unknown>): SiteSettings {
  return {
    id: Number(row.id) || 1,
    logo_url: (row.logo_url as string | null) ?? null,
    phone_number: (row.phone_number as string | null) ?? null,
    whatsapp_number: (row.whatsapp_number as string | null) ?? null,
    telegram_link: (row.telegram_link as string | null) ?? null,
    social_links: normalizeSocialLinks(row.social_links),
    hero_subtitle_ar: (row.hero_subtitle_ar as string | null) ?? null,
    hero_subtitle_en: (row.hero_subtitle_en as string | null) ?? null,
    book_year_label: (row.book_year_label as string | null) ?? null,
    schedules_enabled: row.schedules_enabled !== false,
    grade_calculator_enabled: row.grade_calculator_enabled !== false,
    updated_at:
      (row.updated_at as string | undefined) ?? new Date().toISOString(),
  };
}

async function fetchSettingsRow(): Promise<
  ActionResult<Record<string, unknown>>
> {
  const full = await supabase
    .from("site_settings")
    .select(FULL_SELECT)
    .eq("id", 1)
    .maybeSingle();

  if (!full.error) {
    return { success: true, data: (full.data as Record<string, unknown>) ?? undefined };
  }

  if (
    isMissingColumnError(full.error.message, "schedules_enabled") ||
    isMissingColumnError(full.error.message, "grade_calculator_enabled")
  ) {
    const base = await supabase
      .from("site_settings")
      .select(BASE_SELECT)
      .eq("id", 1)
      .maybeSingle();

    if (base.error) return { success: false, error: base.error.message };
    return {
      success: true,
      data: {
        ...((base.data as Record<string, unknown>) ?? {}),
        schedules_enabled: true,
        grade_calculator_enabled: true,
      },
    };
  }

  return { success: false, error: full.error.message };
}

export async function getSiteSettings(): Promise<ActionResult<SiteSettings>> {
  const authError = await requireAuth<SiteSettings>();
  if (authError) return authError;

  const fetched = await fetchSettingsRow();
  if (!fetched.success) return fetched;

  if (!fetched.data || Object.keys(fetched.data).length === 0) {
    const { data: created, error: insertError } = await supabase
      .from("site_settings")
      .insert({
        id: 1,
        social_links: [],
        hero_subtitle_ar: "منصتك التعليمية الشاملة للمنهج الليبي",
        hero_subtitle_en:
          "Your complete educational hub for the Libyan curriculum",
        book_year_label: "2026 - 2027",
      })
      .select(BASE_SELECT)
      .single();

    if (insertError) return { success: false, error: insertError.message };

    // Best-effort: set feature flags if columns exist
    await supabase
      .from("site_settings")
      .update({
        schedules_enabled: true,
        grade_calculator_enabled: true,
      })
      .eq("id", 1);

    return {
      success: true,
      data: toPublic({
        ...(created as Record<string, unknown>),
        schedules_enabled: true,
        grade_calculator_enabled: true,
      }),
    };
  }

  return { success: true, data: toPublic(fetched.data) };
}

export async function updateSiteSettings(input: {
  logo_url: string;
  phone_number: string;
  whatsapp_number: string;
  telegram_link: string;
  social_links: SocialLink[];
  hero_subtitle_ar: string;
  hero_subtitle_en: string;
  book_year_label: string;
}): Promise<ActionResult<SiteSettings>> {
  const authError = await requireAuth<SiteSettings>();
  if (authError) return authError;

  const social_links = normalizeSocialLinks(input.social_links).filter(
    (link) => link.platform && link.url
  );

  for (const link of social_links) {
    try {
      new URL(link.url);
    } catch {
      return {
        success: false,
        error: `رابط غير صالح لمنصة "${link.platform}"`,
      };
    }
  }

  const payload = {
    id: 1,
    logo_url: input.logo_url.trim() || null,
    phone_number: input.phone_number.trim() || null,
    whatsapp_number: input.whatsapp_number.trim() || null,
    telegram_link: input.telegram_link.trim() || null,
    social_links,
    hero_subtitle_ar: input.hero_subtitle_ar.trim() || null,
    hero_subtitle_en: input.hero_subtitle_en.trim() || null,
    book_year_label: input.book_year_label.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("site_settings")
    .upsert(payload, { onConflict: "id" });

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings");
  const refreshed = await getSiteSettings();
  if (!refreshed.success) return refreshed;
  return {
    success: true,
    data: refreshed.data,
    message: "تم حفظ إعدادات الموقع بنجاح",
  };
}

export async function updateTeacherFeatureFlags(input: {
  schedules_enabled?: boolean;
  grade_calculator_enabled?: boolean;
}): Promise<ActionResult<SiteSettings>> {
  const authError = await requireAuth<SiteSettings>();
  if (authError) return authError;

  const patch: Record<string, boolean | string | number> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof input.schedules_enabled === "boolean") {
    patch.schedules_enabled = input.schedules_enabled;
  }
  if (typeof input.grade_calculator_enabled === "boolean") {
    patch.grade_calculator_enabled = input.grade_calculator_enabled;
  }

  const { error } = await supabase
    .from("site_settings")
    .update(patch)
    .eq("id", 1);

  if (error) {
    if (
      isMissingColumnError(error.message, "schedules_enabled") ||
      isMissingColumnError(error.message, "grade_calculator_enabled")
    ) {
      return { success: false, error: MISSING_FLAGS_HINT };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/teacher-space");
  const refreshed = await getSiteSettings();
  if (!refreshed.success) return refreshed;
  return {
    success: true,
    data: refreshed.data,
    message: "تم تحديث الميزة",
  };
}
