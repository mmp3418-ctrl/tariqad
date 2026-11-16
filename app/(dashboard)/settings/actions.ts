"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import {
  getEffectiveAdminPassword,
  setSessionCookie,
  verifyAdminPassword,
} from "@/lib/auth";
import type { ActionResult, SiteSettings, SocialLink } from "@/lib/types";

const PUBLIC_SETTINGS_SELECT =
  "id, logo_url, phone_number, whatsapp_number, telegram_link, social_links, updated_at";

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

function toPublicSettings(row: SiteSettings): SiteSettings {
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
        admin_password: null,
      })
      .select(PUBLIC_SETTINGS_SELECT)
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    return {
      success: true,
      data: toPublicSettings({
        ...DEFAULT_SETTINGS,
        ...(created as SiteSettings),
      }),
    };
  }

  return {
    success: true,
    data: toPublicSettings(data as SiteSettings),
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
    .select(PUBLIC_SETTINGS_SELECT)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return {
    success: true,
    data: toPublicSettings(data as SiteSettings),
    message: "تم حفظ إعدادات الموقع بنجاح",
  };
}

export async function changeAdminPassword(input: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const current = input.current_password;
  const next = input.new_password.trim();
  const confirm = input.confirm_password;

  if (!current || !next || !confirm) {
    return { success: false, error: "جميع حقول كلمة المرور مطلوبة" };
  }

  if (next.length < 6) {
    return {
      success: false,
      error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل",
    };
  }

  if (next !== confirm) {
    return {
      success: false,
      error: "كلمة المرور الجديدة وتأكيدها غير متطابقتين",
    };
  }

  if (!(await verifyAdminPassword(current))) {
    return { success: false, error: "كلمة المرور الحالية غير صحيحة" };
  }

  // Ensure the settings row exists, then update password only
  const { data: existing, error: existingError } = await supabase
    .from("site_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("site_settings").insert({
      id: 1,
      logo_url: null,
      phone_number: null,
      whatsapp_number: null,
      telegram_link: null,
      social_links: [],
      admin_password: next,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  } else {
    const { error: updateError } = await supabase
      .from("site_settings")
      .update({
        admin_password: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  // Keep the admin logged in under the new password
  const effective = await getEffectiveAdminPassword();
  await setSessionCookie(effective);

  revalidatePath("/settings");
  return { success: true, message: "تم تغيير كلمة المرور بنجاح" };
}
