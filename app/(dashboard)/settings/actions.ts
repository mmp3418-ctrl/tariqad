"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, SiteSettings, SocialLink } from "@/lib/types";

const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  logo_url: null,
  phone_number: null,
  whatsapp_number: null,
  telegram_link: null,
  social_links: [],
  updated_at: new Date().toISOString(),
};

function normalizeSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is SocialLink =>
        !!item &&
        typeof item === "object" &&
        typeof (item as SocialLink).id === "string" &&
        typeof (item as SocialLink).platform === "string" &&
        typeof (item as SocialLink).url === "string" &&
        typeof (item as SocialLink).icon === "string"
    )
    .map((item) => ({
      id: item.id,
      platform: item.platform.trim(),
      url: item.url.trim(),
      icon: item.icon,
    }));
}

export async function getSiteSettings(): Promise<ActionResult<SiteSettings>> {
  const authError = await requireAuth<SiteSettings>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("site_settings")
      .insert({
        id: 1,
        logo_url: null,
        phone_number: null,
        whatsapp_number: null,
        telegram_link: null,
        social_links: [],
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    const row = created as SiteSettings;
    return {
      success: true,
      data: {
        ...DEFAULT_SETTINGS,
        ...row,
        social_links: normalizeSocialLinks(row.social_links),
      },
    };
  }

  const row = data as SiteSettings;
  return {
    success: true,
    data: {
      ...row,
      social_links: normalizeSocialLinks(row.social_links),
    },
  };
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
      // Validate absolute URL
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
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("site_settings")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  const row = data as SiteSettings;
  revalidatePath("/settings");
  return {
    success: true,
    data: {
      ...row,
      social_links: normalizeSocialLinks(row.social_links),
    },
    message: "تم حفظ إعدادات الموقع بنجاح",
  };
}
