"use server";

import { revalidatePath } from "next/cache";
import { settingsUiError } from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import type {
  ActionResult,
  SettingsBundle,
  SiteSettings,
  SocialIconKey,
  SocialLink,
} from "@/lib/types";

const SETTINGS_ID = 1;

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
    return { success: true, data: EMPTY_SETTINGS };
  } catch (err) {
    console.warn("[settings] ensureSettingsRow exception:", err);
    return { success: true, data: EMPTY_SETTINGS };
  }
}

async function fetchSocialLinks(): Promise<ActionResult<SocialLink[]>> {
  try {
    const { data, error } = await supabase
      .from("social_links")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[settings] fetchSocialLinks:", error.message, error);
      return { success: true, data: [] };
    }

    const links = (data ?? []).map((row) =>
      normalizeSocialLink(row as Record<string, unknown>),
    );
    return { success: true, data: links };
  } catch (err) {
    console.warn("[settings] fetchSocialLinks exception:", err);
    return { success: true, data: [] };
  }
}

/** Load site_settings + social_links for the admin settings UI. */
export async function getSettingsBundle(): Promise<
  ActionResult<SettingsBundle>
> {
  try {
    const [settingsResult, linksResult] = await Promise.all([
      ensureSettingsRow(),
      fetchSocialLinks(),
    ]);

    return {
      success: true,
      data: {
        settings: settingsResult.success
          ? (settingsResult.data ?? EMPTY_SETTINGS)
          : EMPTY_SETTINGS,
        social_links: linksResult.success ? (linksResult.data ?? []) : [],
      },
    };
  } catch (err) {
    console.error("[settings] getSettingsBundle exception:", err);
    return {
      success: true,
      data: {
        settings: EMPTY_SETTINGS,
        social_links: [],
      },
    };
  }
}

export type SaveSiteSettingsInput = {
  email: string;
  location: string;
  whatsapp: string;
  telegram: string;
  google_maps_url: string;
};

export async function saveSiteSettings(
  input: SaveSiteSettingsInput,
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
  input: SocialLinkInput,
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
  input: SocialLinkInput,
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
  is_active: boolean,
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

export async function deleteSocialLink(id: string): Promise<ActionResult> {
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
