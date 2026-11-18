"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, Book } from "@/lib/types";

function normalizeBook(row: Record<string, unknown>): Book {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: (row.description as string | null) ?? null,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    download_link: (row.download_link as string | null) ?? null,
    price: (row.price as string | null) ?? null,
    is_visible: row.is_visible !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getBooks(): Promise<ActionResult<Book[]>> {
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[books] getBooks:", error.message, error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) =>
        normalizeBook(row as Record<string, unknown>)
      ),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[books] getBooks exception:", err);
    return { success: false, error: message };
  }
}

export type BookInput = {
  title: string;
  description: string;
  cover_image_url: string;
  download_link: string;
  price: string;
  is_visible: boolean;
};

function buildPayload(input: BookInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
    cover_image_url: input.cover_image_url.trim() || null,
    download_link: input.download_link.trim() || null,
    price: input.price.trim() || null,
    is_visible: input.is_visible !== false,
    updated_at: new Date().toISOString(),
  };
}

export async function createBook(
  input: BookInput
): Promise<ActionResult<Book>> {
  try {
    const title = input.title.trim();
    if (!title) {
      return { success: false, error: "عنوان الكتاب مطلوب" };
    }

    const { count } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true });

    const payload = {
      ...buildPayload(input),
      title,
      sort_order: count ?? 0,
    };

    const { data, error } = await supabase
      .from("books")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[books] createBook:", error.message, { error, payload });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/books");
    return {
      success: true,
      data: normalizeBook(data as Record<string, unknown>),
      message: "تمت إضافة الكتاب بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[books] createBook exception:", err);
    return { success: false, error: message };
  }
}

export async function updateBook(
  id: string,
  input: BookInput
): Promise<ActionResult<Book>> {
  try {
    if (!id) {
      return { success: false, error: "معرّف الكتاب غير صالح" };
    }

    const title = input.title.trim();
    if (!title) {
      return { success: false, error: "عنوان الكتاب مطلوب" };
    }

    const payload = { ...buildPayload(input), title };

    const { data, error } = await supabase
      .from("books")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[books] updateBook:", error.message, {
        error,
        id,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/books");
    return {
      success: true,
      data: normalizeBook(data as Record<string, unknown>),
      message: "تم تحديث الكتاب بنجاح",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[books] updateBook exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleBookVisibility(
  id: string,
  is_visible: boolean
): Promise<ActionResult<Book>> {
  try {
    if (!id) {
      return { success: false, error: "معرّف الكتاب غير صالح" };
    }

    const { data, error } = await supabase
      .from("books")
      .update({ is_visible, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[books] toggleBookVisibility:", error.message, {
        error,
        id,
        is_visible,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/books");
    return {
      success: true,
      data: normalizeBook(data as Record<string, unknown>),
      message: is_visible ? "تم إظهار الكتاب" : "تم إخفاء الكتاب",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[books] toggleBookVisibility exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteBook(id: string): Promise<ActionResult> {
  try {
    if (!id) {
      return { success: false, error: "معرّف الكتاب غير صالح" };
    }

    const { error } = await supabase.from("books").delete().eq("id", id);

    if (error) {
      console.error("[books] deleteBook:", error.message, { error, id });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/books");
    return { success: true, message: "تم حذف الكتاب بنجاح" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[books] deleteBook exception:", err);
    return { success: false, error: message };
  }
}