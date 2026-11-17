"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, SiteSettings, SocialLink } from "@/lib/types";

const PUBLIC_SETTINGS_SELECT =
  "id, logo_url, phone_number, whatsapp_number, telegram_link, social_links, hero_subtitle_ar, hero_subtitle_en, book_year_label, schedules_enabled, grade_calculator_enabled, updated_at";

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

function toPublic(row: Partial<SiteSettings> & { id: number }): SiteSettings {
  return {
    id: row.id,
    logo_url: row.logo_url ?? null,
    phone_number: row.phone_number ?? null,
    whatsapp_number: row.whatsapp_number ?? null,
    telegram_link: row.telegram_link ?? null,
    social_links: normalizeSocialLinks(row.social_links),
    hero_subtitle_ar: row.hero_subtitle_ar ?? null,
    hero_subtitle_en: row.hero_subtitle_en ?? null,
    book_year_label: row.book_year_label ?? null,
    schedules_enabled: row.schedules_enabled !== false,
    grade_calculator_enabled: row.grade_calculator_enabled !== false,
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

export async function getSiteSettings(): Promise<ActionResult<SiteSettings>> {
  const authError = await requireAuth<SiteSettings>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("site_settings")
    .select(PUBLIC_SETTINGS_SELECT)
    .eq("id", 1)
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("site_settings")
      .insert({
        id: 1,
        social_links: [],
        hero_subtitle_ar: "منصتك التعليمية الشاملة للمنهج الليبي",
        hero_subtitle_en:
          "Your complete educational hub for the Libyan curriculum",
        book_year_label: "2026 - 2027",
        schedules_enabled: true,
        grade_calculator_enabled: true,
      })
      .select(PUBLIC_SETTINGS_SELECT)
      .single();
    if (insertError) return { success: false, error: insertError.message };
    return { success: true, data: toPublic(created as SiteSettings) };
  }

  return { success: true, data: toPublic(data as SiteSettings) };
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

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(
      {
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
      },
      { onConflict: "id" }
    )
    .select(PUBLIC_SETTINGS_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/settings");
  return {
    success: true,
    data: toPublic(data as SiteSettings),
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
    id: 1,
    updated_at: new Date().toISOString(),
  };
  if (typeof input.schedules_enabled === "boolean") {
    patch.schedules_enabled = input.schedules_enabled;
  }
  if (typeof input.grade_calculator_enabled === "boolean") {
    patch.grade_calculator_enabled = input.grade_calculator_enabled;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(patch, { onConflict: "id" })
    .select(PUBLIC_SETTINGS_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/teacher-space");
  return {
    success: true,
    data: toPublic(data as SiteSettings),
    message: "تم تحديث الميزة",
  };
}
