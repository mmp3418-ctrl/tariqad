"use server";

import { revalidatePath } from "next/cache";
import { sanitizeLogoUrl } from "@/lib/branding";
import { settingsUiError } from "@/lib/ids";
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

const EMPTY_SETTINGS: SiteSettings = {
  id: SETTINGS_ID,
  email: null,
  location: null,
  whatsapp: null,
  telegram: null,
  google_maps_url: null,
  updated_at: new Date().toISOString(),
};

function normalizeSettings(row: Record<string, unknown>): SiteSettings {
  const rawId = row.id;
  const id =
    typeof rawId === "number" || typeof rawId === "string"
      ? (rawId as number)
      : SETTINGS_ID;
  return {
    id: typeof id === "number" ? id : SETTINGS_ID,
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

/**
 * Load/create the single settings row.
 * Never uses blind `.eq('id', 1)` when the live PK may be UUID.
 */
async function ensureSettingsRow(): Promise<ActionResult<SiteSettings>> {
  try {
    const any = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!any.error && any.data) {
      return {
        success: true,
        data: normalizeSettings(any.data as Record<string, unknown>),
      };
    }

    if (any.error) {
      console.warn("[settings] ensureSettingsRow select:", any.error.message);
    }

    const withIntId = await supabase
      .from("site_settings")
      .upsert({
        id: SETTINGS_ID,
        email: null,
        location: null,
        whatsapp: null,
        telegram: null,
        google_maps_url: null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (!withIntId.error && withIntId.data) {
      return {
        success: true,
        data: normalizeSettings(withIntId.data as Record<string, unknown>),
      };
    }

    const legacy = await supabase
      .from("site_settings")
      .insert({
        email: null,
        location: null,
        whatsapp: null,
        telegram: null,
        google_maps_url: null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (!legacy.error && legacy.data) {
      return {
        success: true,
        data: normalizeSettings(legacy.data as Record<string, unknown>),
      };
    }

    console.warn(
      "[settings] ensureSettingsRow soft-fail:",
      withIntId.error?.message,
      legacy.error?.message,
    );
    // Soft-fail so branding/settings UI can still render without stage/grade toasts.
    return { success: true, data: EMPTY_SETTINGS };
  } catch (err) {
    console.warn("[settings] ensureSettingsRow exception:", err);
    return { success: true, data: EMPTY_SETTINGS };
  }
}

function normalizeBranding(row: Record<string, unknown>): SiteBranding {
  const rawId = row.id;
  return {
    id:
      typeof rawId === "number" || typeof rawId === "string"
        ? rawId
        : BRANDING_ID,
    logo_url: sanitizeLogoUrl(row.logo_url),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

const EMPTY_BRANDING: SiteBranding = { id: BRANDING_ID, logo_url: null };

/**
 * Load/create the single branding row.
 * Soft-fails to empty branding — never surfaces stage/grade or UUID jargon.
 * Avoids blind `.eq('id', 1)` when the live PK type is unknown.
 */
async function ensureBrandingRow(): Promise<ActionResult<SiteBranding>> {
  try {
    const any = await supabase
      .from("site_branding")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!any.error && any.data) {
      return {
        success: true,
        data: normalizeBranding(any.data as Record<string, unknown>),
      };
    }

    if (any.error) {
      console.warn("[settings] ensureBrandingRow select:", any.error.message);
    }

    // Prefer insert without fixed id (works for uuid defaults); then integer id=1.
    const legacy = await supabase
      .from("site_branding")
      .insert({
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (!legacy.error && legacy.data) {
      return {
        success: true,
        data: normalizeBranding(legacy.data as Record<string, unknown>),
      };
    }

    const withIntId = await supabase
      .from("site_branding")
      .upsert({
        id: BRANDING_ID,
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (!withIntId.error && withIntId.data) {
      return {
        success: true,
        data: normalizeBranding(withIntId.data as Record<string, unknown>),
      };
    }

    console.warn(
      "[settings] ensureBrandingRow soft-fail:",
      legacy.error?.message,
      withIntId.error?.message,
    );
    return { success: true, data: EMPTY_BRANDING };
  } catch (err) {
    console.warn("[settings] ensureBrandingRow exception:", err);
    return { success: true, data: EMPTY_BRANDING };
  }
}

async function fetchSocialLinks(): Promise<ActionResult<SocialLink[]>> {
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[settings] fetchSocialLinks:", error.message, error);
    // Soft-fail: empty channels rather than stage/grade / UUID toast on mount.
    return { success: true, data: [] };
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

    // Always succeed for settings/branding — never toast stage/grade on mount.
    return {
      success: true,
      data: {
        settings: settingsResult.success
          ? (settingsResult.data ?? EMPTY_SETTINGS)
          : EMPTY_SETTINGS,
        social_links: linksResult.success ? (linksResult.data ?? []) : [],
        branding: brandingResult.success
          ? (brandingResult.data ?? EMPTY_BRANDING)
          : EMPTY_BRANDING,
      },
    };
  } catch (err) {
    console.error("[settings] getSettingsBundle exception:", err);
    return {
      success: true,
      data: {
        settings: EMPTY_SETTINGS,
        social_links: [],
        branding: EMPTY_BRANDING,
      },
    };
  }
}

export async function getSiteBranding(): Promise<ActionResult<SiteBranding>> {
  try {
    return await ensureBrandingRow();
  } catch (err) {
    console.warn("[settings] getSiteBranding exception:", err);
    return { success: true, data: EMPTY_BRANDING };
  }
}

export async function setSiteLogoUrl(
  logoUrl: string | null
): Promise<ActionResult<SiteBranding>> {
  try {
    const trimmed = sanitizeLogoUrl(logoUrl);
    const updated_at = new Date().toISOString();

    // Update existing row first (works for integer or uuid PK) — never force id=1.
    const existing = await supabase
      .from("site_branding")
      .select("id")
      .limit(1)
      .maybeSingle();

    let data: Record<string, unknown> | null = null;
    let errorMessage = "";

    if (!existing.error && existing.data?.id != null) {
      const updated = await supabase
        .from("site_branding")
        .update({ logo_url: trimmed, updated_at })
        .eq("id", existing.data.id)
        .select("*")
        .maybeSingle();
      if (updated.error) {
        errorMessage = updated.error.message;
      } else {
        data = (updated.data as Record<string, unknown> | null) ?? null;
      }
    } else {
      const inserted = await supabase
        .from("site_branding")
        .insert({ logo_url: trimmed, updated_at })
        .select("*")
        .maybeSingle();
      if (inserted.error) {
        const withIntId = await supabase
          .from("site_branding")
          .upsert({ id: BRANDING_ID, logo_url: trimmed, updated_at })
          .select("*")
          .maybeSingle();
        if (withIntId.error) {
          errorMessage = withIntId.error.message || inserted.error.message;
        } else {
          data = (withIntId.data as Record<string, unknown> | null) ?? null;
        }
      } else {
        data = (inserted.data as Record<string, unknown> | null) ?? null;
      }
    }

    if (!data) {
      console.error("[settings] setSiteLogoUrl:", errorMessage);
      return {
        success: false,
        error: settingsUiError(
          errorMessage,
          "تعذّر حفظ الشعار حالياً، يرجى المحاولة لاحقاً.",
        ),
      };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return {
      success: true,
      data: normalizeBranding(data),
      message: trimmed
        ? "تم تحديث شعار المنصة"
        : "تم استعادة الشعار الافتراضي",
    };
  } catch (err) {
    console.error("[settings] setSiteLogoUrl exception:", err);
    return {
      success: false,
      error: "تعذّر حفظ الشعار حالياً، يرجى المحاولة لاحقاً.",
    };
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
    const fields = {
      email: input.email.trim() || null,
      location: input.location.trim() || null,
      whatsapp: input.whatsapp.trim() || null,
      telegram: input.telegram.trim() || null,
      google_maps_url: input.google_maps_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const existing = await supabase
      .from("site_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    let data: Record<string, unknown> | null = null;
    let errorMessage = "";

    if (!existing.error && existing.data?.id != null) {
      const updated = await supabase
        .from("site_settings")
        .update(fields)
        .eq("id", existing.data.id)
        .select("*")
        .maybeSingle();
      if (updated.error) {
        errorMessage = updated.error.message;
      } else {
        data = (updated.data as Record<string, unknown> | null) ?? null;
      }
    } else {
      const inserted = await supabase
        .from("site_settings")
        .insert(fields)
        .select("*")
        .maybeSingle();
      if (inserted.error) {
        const withIntId = await supabase
          .from("site_settings")
          .upsert({ id: SETTINGS_ID, ...fields })
          .select("*")
          .maybeSingle();
        if (withIntId.error) {
          errorMessage = withIntId.error.message || inserted.error.message;
        } else {
          data = (withIntId.data as Record<string, unknown> | null) ?? null;
        }
      } else {
        data = (inserted.data as Record<string, unknown> | null) ?? null;
      }
    }

    if (!data) {
      console.error("[settings] saveSiteSettings:", errorMessage);
      return {
        success: false,
        error: settingsUiError(
          errorMessage,
          "تعذّر حفظ الإعدادات حالياً، يرجى المحاولة لاحقاً.",
        ),
      };
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      data: normalizeSettings(data),
      message: "تم حفظ إعدادات التواصل والموقع بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] saveSiteSettings exception:", err);
    return { success: false, error: settingsUiError(message) };
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
      return { success: false, error: settingsUiError(error.message) };
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
    return { success: false, error: settingsUiError(message) };
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
      return { success: false, error: settingsUiError(error.message) };
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
    return { success: false, error: settingsUiError(message) };
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
      return { success: false, error: settingsUiError(error.message) };
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
    return { success: false, error: settingsUiError(message) };
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
      return { success: false, error: settingsUiError(error.message) };
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "تم حذف القناة بنجاح" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[settings] deleteSocialLink exception:", err);
    return { success: false, error: settingsUiError(message) };
  }
}