"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  BookOpen,
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  createBook,
  deleteBook,
  getBooks,
  toggleBookVisibility,
  updateBook,
} from "@/app/admin/books/actions";
import { safeExternalHref } from "@/lib/social";
import type { Book } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  title: "",
  description: "",
  cover_image_url: "",
  download_link: "",
  price: "",
  is_visible: true,
};

export function BooksManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const visibleCount = useMemo(
    () => books.filter((b) => b.is_visible).length,
    [books]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBooks();
      if (result.success && result.data) {
        setBooks(result.data);
      } else if (!result.success) {
        error(result.error || "تعذر تحميل الكتب");
      }
    } catch (err) {
      console.error("[books-manager] load:", err);
      error("تعذر تحميل الكتب من Supabase");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(book: Book) {
    setEditing(book);
    setForm({
      title: book.title,
      description: book.description ?? "",
      cover_image_url: book.cover_image_url ?? "",
      download_link: book.download_link ?? "",
      price: book.price ?? "",
      is_visible: book.is_visible,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("عنوان الكتاب مطلوب");
      return;
    }

    if (form.cover_image_url.trim() && !safeExternalHref(form.cover_image_url)) {
      setFormError("رابط صورة الغلاف يجب أن يبدأ بـ https://");
      return;
    }

    if (form.download_link.trim() && !safeExternalHref(form.download_link)) {
      setFormError("رابط التحميل يجب أن يبدأ بـ https://");
      return;
    }

    const input = {
      title: form.title.trim(),
      description: form.description.trim(),
      cover_image_url: form.cover_image_url.trim(),
      download_link: form.download_link.trim(),
      price: form.price.trim(),
      is_visible: form.is_visible,
    };

    startTransition(async () => {
      try {
        const result = editing
          ? await updateBook(editing.id, input)
          : await createBook(input);

        if (result.success && result.data) {
          setBooks((prev) =>
            editing
              ? prev.map((b) => (b.id === editing.id ? result.data! : b))
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[books-manager] save:", err);
        error("حدث خطأ أثناء حفظ الكتاب");
      }
    });
  }

  function handleToggle(id: string, is_visible: boolean) {
    startTransition(async () => {
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_visible } : b))
      );

      try {
        const result = await toggleBookVisibility(id, is_visible);
        if (result.success && result.data) {
          setBooks((prev) =>
            prev.map((b) => (b.id === id ? result.data! : b))
          );
          success(result.message ?? "تم التحديث");
        } else if (!result.success) {
          setBooks((prev) =>
            prev.map((b) =>
              b.id === id ? { ...b, is_visible: !is_visible } : b
            )
          );
          error(result.error);
        }
      } catch (err) {
        console.error("[books-manager] toggle:", err);
        setBooks((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, is_visible: !is_visible } : b
          )
        );
        error("تعذر تحديث ظهور الكتاب");
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);

    startTransition(async () => {
      const previous = books;
      setBooks((prev) => prev.filter((b) => b.id !== id));

      try {
        const result = await deleteBook(id);
        if (result.success) {
          success(result.message ?? "تم الحذف");
        } else {
          setBooks(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[books-manager] delete:", err);
        setBooks(previous);
        error("تعذر حذف الكتاب");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600 dark:text-slate-400">
        جاري تحميل الكتب...
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-semibold">المكتبة</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            إدارة الكتب
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            إضافة وتعديل وحذف الكتب مع التحكم في الظهور على الموقع
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            ظاهرة:{" "}
            <span className="font-bold text-teal-700 dark:text-teal-300">
              {visibleCount}
            </span>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" />
            إضافة كتاب
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="space-y-3">
          {books.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
              لا توجد كتب بعد — أضف أول كتاب من هنا
            </div>
          ) : (
            books.map((book) => {
              const cover = safeExternalHref(book.cover_image_url ?? "");
              const download = safeExternalHref(book.download_link ?? "");
              return (
                <article
                  key={book.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-teal-200 dark:border-slate-800 dark:hover:border-teal-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                      {cover ? (
                                                <img
                          src={cover}
                          alt={book.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {book.title}
                      </p>
                      {book.price ? (
                        <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
                          {book.price}
                        </p>
                      ) : null}
                      {book.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {book.description}
                        </p>
                      ) : null}
                      {download ? (
                        <a
                          href={download}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          رابط التحميل
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Switch
                      checked={book.is_visible}
                      onChange={(v) => handleToggle(book.id, v)}
                      label={book.is_visible ? "ظاهر" : "مخفي"}
                      disabled={pending}
                    />
                    <button
                      type="button"
                      onClick={() => openEdit(book)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(book.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل كتاب" : "إضافة كتاب"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              العنوان
            </span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="عنوان الكتاب"
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              الوصف
            </span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="وصف مختصر للكتاب"
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              رابط صورة الغلاف
            </span>
            <input
              value={form.cover_image_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, cover_image_url: e.target.value }))
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              رابط التحميل
            </span>
            <input
              value={form.download_link}
              onChange={(e) =>
                setForm((f) => ({ ...f, download_link: e.target.value }))
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              السعر
            </span>
            <input
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="مجاني / 50 د.ل / ..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              {form.is_visible ? (
                <Eye className="h-4 w-4 text-teal-700" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-400" />
              )}
              ظاهر على الموقع العام
            </div>
            <Switch
              checked={form.is_visible}
              onChange={(v) => setForm((f) => ({ ...f, is_visible: v }))}
            />
          </div>

          {formError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 rounded-xl px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="إلغاء"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              حذف الكتاب
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              هل أنت متأكد من حذف هذا الكتاب؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="h-10 rounded-xl px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}