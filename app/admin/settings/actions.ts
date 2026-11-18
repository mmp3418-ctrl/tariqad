"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { ActionResult, SiteSettings, SocialLink } from "@/lib/types";

function normalizeRow(row: Record<string, unknown>): SiteSettings {
  const links = Array.isArray(row.social_links)
    ? (row.social_links as SocialLink[])
    : [];

  return {
    id: 1,
    phone_number: (row.phone_number as string | null) ?? null,
    whatsapp_number: (row.whatsapp_number as string | null) ?? null,
    telegram_link: (row.telegram_link as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    location_text: (row.location_text as string | null) ?? null,
    maps_url: (row.maps_url as string | null) ?? null,
    social_links: links.map((link) => ({
      id: String(link.id ?? crypto.randomUUID()),
      platform: String(link.platform ?? ""),
      label: String(link.label ?? link.platform ?? ""),
      url: String(link.url ?? ""),
      icon: (link.icon as SocialLink["icon"]) || "globe",
      is_visible: link.is_visible !== false,
    })),
    hero_subtitle_ar: (row.hero_subtitle_ar as string | null) ?? null,
    book_year_label: (row.book_year_label as string | null) ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

const EMPTY_SEED = {
  id: 1,
  phone_number: null,
  whatsapp_number: null,
  telegram_link: null,
  email: null,
  location_text: null,
  maps_url: null,
  social_links: [] as SocialLink[],
  hero_subtitle_ar: null,
  book_year_label: null,
  updated_at: new Date().toISOString(),
};

export async function getSiteSettings(): Promise<ActionResult<SiteSettings>> {
  try {
    if (!hasSupabaseConfig()) {
      return { success: false, error: "NO_SUPABASE" };
    }

    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[settings] getSiteSettings:", error.message);
      return { success: false, error: error.message };
    }

    if (!data) {
      const inserted = await supabase
        .from("site_settings")
        .upsert(EMPTY_SEED)
        .select("*")
        .single();
      if (inserted.error) {
        return { success: false, error: inserted.error.message };
      }
      return {
        success: true,
        data: normalizeRow(inserted.data as Record<string, unknown>),
      };
    }

    return {
      success: true,
      data: normalizeRow(data as Record<string, unknown>),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] getSiteSettings exception:", err);
    return { success: false, error: message };
  }
}

export type SaveSiteSettingsInput = {
  phone_number: string;
  whatsapp_number: string;
  telegram_link: string;
  email: string;
  location_text: string;
  maps_url: string;
  hero_subtitle_ar: string;
  book_year_label: string;
  social_links: SocialLink[];
};

export async function saveSiteSettings(
  input: SaveSiteSettingsInput
): Promise<ActionResult<SiteSettings>> {
  try {
    if (!hasSupabaseConfig()) {
      return { success: false, error: "NO_SUPABASE" };
    }

    const payload = {
      id: 1,
      phone_number: input.phone_number.trim() || null,
      whatsapp_number: input.whatsapp_number.trim() || null,
      telegram_link: input.telegram_link.trim() || null,
      email: input.email.trim() || null,
      location_text: input.location_text.trim() || null,
      maps_url: input.maps_url.trim() || null,
      hero_subtitle_ar: input.hero_subtitle_ar.trim() || null,
      book_year_label: input.book_year_label.trim() || null,
      social_links: input.social_links,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("site_settings")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[settings] saveSiteSettings:", error.message, payload);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      data: normalizeRow(data as Record<string, unknown>),
      message: "تم حفظ إعدادات الموقع بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] saveSiteSettings exception:", err);
    return { success: false, error: message };
  }
}
