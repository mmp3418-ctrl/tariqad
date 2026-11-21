"use server";

import { revalidatePath } from "next/cache";
import { arabicDbError } from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import type {
  ActionResult,
  SettingsBundle,
  SiteBranding,
  SiteSettings,
  SocialIconKey,
  SocialLink,
} from "@/lib/types";

const SETTINGS_ID = 1;
const BRANDING_ID = 1;
export const DEFAULT_LOGO_PATH = "/logo.png";

function normalizeSettings(row: Record<string, unknown>): SiteSettings {
  return {
    id: SETTINGS_ID,
    email: (row.email as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    whatsapp: (row.whatsapp as string | null) ?? null,
    telegram: (row.telegram as string | null) ?? null,
    google_maps_url: (row.google_maps_url as string | null) ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeSocialLink(row: Record<string, unknown>): SocialLink {
  const icon = String(row.icon_name ?? "globe") as SocialIconKey;
  return {
    id: String(row.id),
    platform_name: String(row.platform_name ?? ""),
    url: String(row.url ?? ""),
    icon_name: icon || "globe",
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

const EMPTY_SETTINGS_SEED = {
  id: SETTINGS_ID,
  email: null,
  location: null,
  whatsapp: null,
  telegram: null,
  google_maps_url: null,
  updated_at: new Date().toISOString(),
};

async function ensureSettingsRow(): Promise<ActionResult<SiteSettings>> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("[settings] ensureSettingsRow select:", error.message, error);
    return { success: false, error: error.message };
  }

  if (data) {
    return {
      success: true,
      data: normalizeSettings(data as Record<string, unknown>),
    };
  }

  const inserted = await supabase
    .from("site_settings")
    .upsert(EMPTY_SETTINGS_SEED)
    .select("*")
    .single();

  if (inserted.error) {
    console.error(
      "[settings] ensureSettingsRow upsert:",
      inserted.error.message,
      inserted.error
    );
    return { success: false, error: inserted.error.message };
  }

  return {
    success: true,
    data: normalizeSettings(inserted.data as Record<string, unknown>),
  };
}

function normalizeBranding(row: Record<string, unknown>): SiteBranding {
  const raw = String(row.logo_url ?? "").trim();
  return {
    id: BRANDING_ID,
    logo_url: raw || null,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function ensureBrandingRow(): Promise<ActionResult<SiteBranding>> {
  const { data, error } = await supabase
    .from("site_branding")
    .select("*")
    .eq("id", BRANDING_ID)
    .maybeSingle();

  if (error) {
    console.error("[settings] ensureBrandingRow select:", error.message);
    return { success: false, error: arabicDbError(error.message) };
  }

  if (data) {
    return {
      success: true,
      data: normalizeBranding(data as Record<string, unknown>),
    };
  }

  const inserted = await supabase
    .from("site_branding")
    .upsert({
      id: BRANDING_ID,
      logo_url: null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (inserted.error) {
    console.error("[settings] ensureBrandingRow upsert:", inserted.error.message);
    return { success: false, error: arabicDbError(inserted.error.message) };
  }

  return {
    success: true,
    data: normalizeBranding(inserted.data as Record<string, unknown>),
  };
}

async function fetchSocialLinks(): Promise<ActionResult<SocialLink[]>> {
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[settings] fetchSocialLinks:", error.message, error);
    return { success: false, error: error.message };
  }

  const links = (data ?? []).map((row) =>
    normalizeSocialLink(row as Record<string, unknown>)
  );
  return { success: true, data: links };
}

/** Load site_settings + social_links + branding together for the admin UI. */
export async function getSettingsBundle(): Promise<
  ActionResult<SettingsBundle>
> {
  try {
    const [settingsResult, linksResult, brandingResult] = await Promise.all([
      ensureSettingsRow(),
      fetchSocialLinks(),
      ensureBrandingRow(),
    ]);

    if (!settingsResult.success) {
      return { success: false, error: settingsResult.error };
    }
    if (!linksResult.success) {
      return { success: false, error: linksResult.error };
    }

    return {
      success: true,
      data: {
        settings: settingsResult.data!,
        social_links: linksResult.data ?? [],
        branding: brandingResult.success
          ? brandingResult.data!
          : { id: BRANDING_ID, logo_url: null },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] getSettingsBundle exception:", err);
    return { success: false, error: arabicDbError(message) };
  }
}

export async function getSiteBranding(): Promise<ActionResult<SiteBranding>> {
  try {
    return await ensureBrandingRow();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: arabicDbError(message) };
  }
}

export async function setSiteLogoUrl(
  logoUrl: string | null
): Promise<ActionResult<SiteBranding>> {
  try {
    const trimmed = String(logoUrl ?? "").trim();
    const payload = {
      id: BRANDING_ID,
      logo_url: trimmed || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("site_branding")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[settings] setSiteLogoUrl:", error.message);
      return { success: false, error: arabicDbError(error.message) };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return {
      success: true,
      data: normalizeBranding(data as Record<string, unknown>),
      message: trimmed
        ? "تم تحديث شعار المنصة"
        : "تم استعادة الشعار الافتراضي",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: arabicDbError(message) };
  }
}

export async function resetSiteLogo(): Promise<ActionResult<SiteBranding>> {
  return setSiteLogoUrl(null);
}

export type SaveSiteSettingsInput = {
  email: string;
  location: string;
  whatsapp: string;
  telegram: string;
  google_maps_url: string;
};

export async function saveSiteSettings(
  input: SaveSiteSettingsInput
): Promise<ActionResult<SiteSettings>> {
  try {
    const payload = {
      id: SETTINGS_ID,
      email: input.email.trim() || null,
      location: input.location.trim() || null,
      whatsapp: input.whatsapp.trim() || null,
      telegram: input.telegram.trim() || null,
      google_maps_url: input.google_maps_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("site_settings")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[settings] saveSiteSettings:", error.message, {
        error,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      data: normalizeSettings(data as Record<string, unknown>),
      message: "تم حفظ إعدادات التواصل والموقع بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] saveSiteSettings exception:", err);
    return { success: false, error: message };
  }
}

export type SocialLinkInput = {
  platform_name: string;
  url: string;
  icon_name: SocialIconKey;
  is_active: boolean;
};

export async function createSocialLink(
  input: SocialLinkInput
): Promise<ActionResult<SocialLink>> {
  try {
    const platform_name = input.platform_name.trim();
    const url = input.url.trim();
    if (!platform_name) {
      return { success: false, error: "اسم المنصة مطلوب" };
    }
    if (!url) {
      return { success: false, error: "الرابط مطلوب" };
    }

    const { count } = await supabase
      .from("social_links")
      .select("*", { count: "exact", head: true });

    const payload = {
      platform_name,
      url,
      icon_name: input.icon_name || "globe",
      is_active: input.is_active !== false,
      sort_order: count ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("social_links")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[settings] createSocialLink:", error.message, {
        error,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      data: normalizeSocialLink(data as Record<string, unknown>),
      message: "تمت إضافة القناة بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] createSocialLink exception:", err);
    return { success: false, error: message };
  }
}

export async function updateSocialLink(
  id: string,
  input: SocialLinkInput
): Promise<ActionResult<SocialLink>> {
  try {
    if (!id) {
      return { success: false, error: "معرّف القناة غير صالح" };
    }

    const platform_name = input.platform_name.trim();
    const url = input.url.trim();
    if (!platform_name) {
      return { success: false, error: "اسم المنصة مطلوب" };
    }
    if (!url) {
      return { success: false, error: "الرابط مطلوب" };
    }

    const payload = {
      platform_name,
      url,
      icon_name: input.icon_name || "globe",
      is_active: input.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("social_links")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[settings] updateSocialLink:", error.message, {
        error,
        id,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      data: normalizeSocialLink(data as Record<string, unknown>),
      message: "تم تحديث القناة بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] updateSocialLink exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleSocialLinkActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<SocialLink>> {
  try {
    if (!id) {
      return { success: false, error: "معرّف القناة غير صالح" };
    }

    const { data, error } = await supabase
      .from("social_links")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[settings] toggleSocialLinkActive:", error.message, {
        error,
        id,
        is_active,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      data: normalizeSocialLink(data as Record<string, unknown>),
      message: is_active ? "تم تفعيل القناة" : "تم إيقاف القناة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] toggleSocialLinkActive exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteSocialLink(
  id: string
): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: "معرّف القناة غير صالح" };
    }

    const { error } = await supabase
      .from("social_links")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[settings] deleteSocialLink:", error.message, {
        error,
        id,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "تم حذف القناة بنجاح" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] deleteSocialLink exception:", err);
    return { success: false, error: message };
  }
}