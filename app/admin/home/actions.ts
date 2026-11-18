"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, HomeContent } from "@/lib/types";

const HOME_ID = 1;

function normalizeHome(row: Record<string, unknown>): HomeContent {
  return {
    id: HOME_ID,
    hero_title: (row.hero_title as string | null) ?? null,
    hero_subtitle: (row.hero_subtitle as string | null) ?? null,
    cta_button: (row.cta_button as string | null) ?? null,
    about_text: (row.about_text as string | null) ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

const EMPTY_SEED = {
  id: HOME_ID,
  hero_title: null,
  hero_subtitle: null,
  cta_button: null,
  about_text: null,
  updated_at: new Date().toISOString(),
};

export async function getHomeContent(): Promise<ActionResult<HomeContent>> {
  try {
    const { data, error } = await supabase
      .from("home_content")
      .select("*")
      .eq("id", HOME_ID)
      .maybeSingle();

    if (error) {
      console.error("[home] getHomeContent select:", error.message, error);
      return { success: false, error: error.message };
    }

    if (data) {
      return {
        success: true,
        data: normalizeHome(data as Record<string, unknown>),
      };
    }

    const inserted = await supabase
      .from("home_content")
      .upsert(EMPTY_SEED)
      .select("*")
      .single();

    if (inserted.error) {
      console.error(
        "[home] getHomeContent upsert:",
        inserted.error.message,
        inserted.error
      );
      return { success: false, error: inserted.error.message };
    }

    return {
      success: true,
      data: normalizeHome(inserted.data as Record<string, unknown>),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[home] getHomeContent exception:", err);
    return { success: false, error: message };
  }
}

export type SaveHomeContentInput = {
  hero_title: string;
  hero_subtitle: string;
  cta_button: string;
  about_text: string;
};

export async function saveHomeContent(
  input: SaveHomeContentInput
): Promise<ActionResult<HomeContent>> {
  try {
    const payload = {
      id: HOME_ID,
      hero_title: input.hero_title.trim() || null,
      hero_subtitle: input.hero_subtitle.trim() || null,
      cta_button: input.cta_button.trim() || null,
      about_text: input.about_text.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("home_content")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[home] saveHomeContent:", error.message, { error, payload });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/home");
    return {
      success: true,
      data: normalizeHome(data as Record<string, unknown>),
      message: "تم حفظ محتوى الصفحة الرئيسية بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[home] saveHomeContent exception:", err);
    return { success: false, error: message };
  }
}