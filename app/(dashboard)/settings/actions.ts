"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, SiteSettings, SocialLink } from "@/lib/types";

const PUBLIC_SETTINGS_SELECT =
  "id, logo_url, phone_number, whatsapp_number, telegram_link, social_links, updated_at";

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

function toPublic(row: SiteSettings): SiteSettings {
  return {
    id: row.id,
    logo_url: row.logo_url,
    phone_number: row.phone_number,
    whatsapp_number: row.whatsapp_number,
    telegram_link: row.telegram_link,
    social_links: normalizeSocialLinks(row.social_links),
    updated_at: row.updated_at,
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
      .insert({ id: 1, social_links: [] })
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
