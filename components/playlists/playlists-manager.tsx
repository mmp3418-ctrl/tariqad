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
  CirclePlay,
  ExternalLink,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import {
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  togglePlaylistActive,
  updatePlaylist,
} from "@/app/admin/playlists/actions";
import {
  MATERIAL_TYPE_OPTIONS,
  isValidYoutubeUrl,
  materialTypeLabel,
} from "@/lib/academic";
import { safeExternalHref } from "@/lib/social";
import { uploadPlaylistCover } from "@/lib/storage";
import type {
  AcademicGrade,
  AcademicStage,
  MaterialType,
  VideoPlaylist,
} from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const selectClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const emptyForm = {
  title: "",
  playlist_url: "",
  unit_name: "",
  material_type: "كتاب حصة" as MaterialType,
  cover_image_url: "",
  stage_id: "",
  grade_id: "",
  is_active: true,
};

export function PlaylistsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoPlaylist[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VideoPlaylist | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const filteredGrades = useMemo(
    () =>
      grades.filter(
        (g) => g.stage_id === form.stage_id && g.is_active !== false
      ),
    [grades, form.stage_id]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tree, list] = await Promise.all([
        getAcademicTree(),
        getPlaylists(),
      ]);
      if (tree.success && tree.data) {
        setStages(tree.data.stages);
        setGrades(tree.data.grades);
      } else if (!tree.success) {
        error(tree.error);
      }
      if (list.success && list.data) {
        setItems(list.data);
      } else if (!list.success) {
        error(list.error);
      }
    } catch (err) {
      console.error("[playlists-manager] load:", err);
      error("تعذر تحميل قوائم التشغيل");
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

  function openEdit(item: VideoPlaylist) {
    setEditing(item);
    setForm({
      title: item.title,
      playlist_url: item.playlist_url,
      unit_name: item.unit_name,
      material_type: item.material_type,
      cover_image_url: item.cover_image_url ?? "",
      stage_id: item.stage_id ?? "",
      grade_id: item.grade_id ?? "",
      is_active: item.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleCoverChange(file: File | null) {
    if (!file) return;
    setFormError(null);
    setUploadingCover(true);
    try {
      const result = await uploadPlaylistCover(file);
      if (result.success && result.data) {
        setForm((f) => ({ ...f, cover_image_url: result.data!.publicUrl }));
        success(result.message ?? "تم رفع الغلاف");
      } else if (!result.success) {
        setFormError(result.error);
        error(result.error);
      }
    } catch (err) {
      console.error("[playlists-manager] cover upload:", err);
      const message =
        err instanceof Error ? err.message : "فشل رفع صورة الغلاف";
      setFormError(message);
      error(message);
    } finally {
      setUploadingCover(false);
    }
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("العنوان مطلوب");
      return;
    }
    if (!isValidYoutubeUrl(form.playlist_url)) {
      setFormError("رابط يوتيوب غير صالح");
      return;
    }
    if (!form.unit_name.trim()) {
      setFormError("اسم الوحدة مطلوب");
      return;
    }
    if (!form.stage_id || !form.grade_id) {
      setFormError("اختر المرحلة والصف");
      return;
    }

    startTransition(async () => {
      try {
        const result = editing
          ? await updatePlaylist(editing.id, form)
          : await createPlaylist(form);
        if (result.success && result.data) {
          setItems((prev) =>
            editing
              ? prev.map((p) => (p.id === editing.id ? result.data! : p))
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[playlists-manager] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function handleToggle(id: string, is_active: boolean) {
    const previous = items;
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active } : p))
    );
    startTransition(async () => {
      try {
        const result = await togglePlaylistActive(id, is_active);
        if (result.success && result.data) {
          setItems((prev) =>
            prev.map((p) => (p.id === id ? result.data! : p))
          );
          success(result.message ?? "تم");
        } else if (!result.success) {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[playlists-manager] toggle:", err);
        setItems(previous);
        error("تعذر التحديث");
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    startTransition(async () => {
      const previous = items;
      setItems((prev) => prev.filter((p) => p.id !== id));
      try {
        const result = await deletePlaylist(id);
        if (result.success) success(result.message ?? "تم الحذف");
        else {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[playlists-manager] delete:", err);
        setItems(previous);
        error("تعذر الحذف");
      }
    });
  }

  function stageName(id: string | null) {
    return stages.find((s) => s.id === id)?.name ?? "—";
  }
  function gradeName(id: string | null) {
    return grades.find((g) => g.id === id)?.name ?? "—";
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        جاري تحميل قوائم التشغيل...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-300/90">
            <CirclePlay className="h-5 w-5" />
            <span className="text-sm font-semibold">الشروحات المرئية</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">قوائم التشغيل</h2>
          <p className="mt-1 text-sm text-slate-400">
            رابط يوتيوب + نوع المادة + اسم الوحدة يدوياً مع ربط المرحلة والصف
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition hover:from-teal-600 hover:to-teal-500"
        >
          <Plus className="h-4 w-4" />
          إضافة قائمة
        </button>
      </header>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-black/40 sm:p-6">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">
              لا توجد قوائم بعد — أضف أول قائمة تشغيل
            </div>
          ) : (
            items.map((item) => {
              const href = safeExternalHref(item.playlist_url);
              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-teal-500/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {item.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.cover_image_url}
                        alt=""
                        className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300 ring-1 ring-white/10">
                        <CirclePlay className="h-6 w-6" />
                      </span>
                    )}
                    <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-white">
                        {item.title}
                      </p>
                      <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-300">
                        {materialTypeLabel(item.material_type)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {stageName(item.stage_id)} · {gradeName(item.grade_id)} ·{" "}
                      {item.unit_name || "—"}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-teal-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.playlist_url}</span>
                      </a>
                    ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch
                      checked={item.is_active}
                      onChange={(v) => handleToggle(item.id, v)}
                      label={item.is_active ? "مفعّل" : "متوقف"}
                      disabled={pending}
                    />
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
                      aria-label="تعديل"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(item.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10"
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
        title={editing ? "تعديل قائمة" : "إضافة قائمة تشغيل"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">العنوان</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="عنوان الشرح / القائمة"
              className={selectClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">رابط يوتيوب</span>
            <input
              value={form.playlist_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, playlist_url: e.target.value }))
              }
              required
              placeholder="https://www.youtube.com/playlist?list=..."
              className={selectClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">اسم الوحدة</span>
            <input
              value={form.unit_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit_name: e.target.value }))
              }
              required
              placeholder="اكتب اسم الوحدة يدوياً"
              className={selectClass}
            />
          </label>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <span className="text-sm font-medium">غلاف القائمة (اختياري)</span>
            <p className="text-xs text-slate-500">
              ارفع صورة غلاف أو الصق رابط صورة. إن تُرك فارغاً سيظهر غلاف افتراضي في الموقع.
            </p>
            {form.cover_image_url ? (
              <div className="relative mt-2 overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.cover_image_url}
                  alt="غلاف القائمة"
                  className="h-36 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, cover_image_url: "" }))
                  }
                  className="absolute start-2 top-2 inline-flex h-8 items-center gap-1 rounded-lg bg-black/70 px-2 text-xs font-semibold text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  إزالة
                </button>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 px-3 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/10">
                <ImagePlus className="h-4 w-4" />
                {uploadingCover ? "جاري الرفع..." : "رفع صورة"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadingCover || pending}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    void handleCoverChange(file);
                  }}
                />
              </label>
              <input
                value={form.cover_image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cover_image_url: e.target.value }))
                }
                placeholder="أو الصق رابط صورة (اختياري)"
                className={selectClass}
              />
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">نوع المادة</span>
            <select
              value={form.material_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  material_type: e.target.value as MaterialType,
                }))
              }
              className={selectClass}
            >
              {MATERIAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">المرحلة</span>
              <select
                value={form.stage_id}
                required
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stage_id: e.target.value,
                    grade_id: "",
                  }))
                }
                className={selectClass}
              >
                <option value="">اختر المرحلة</option>
                {stages
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">الصف</span>
              <select
                value={form.grade_id}
                required
                disabled={!form.stage_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, grade_id: e.target.value }))
                }
                className={`${selectClass} disabled:opacity-40`}
              >
                <option value="">اختر الصف</option>
                {filteredGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700">
            <span className="text-sm">مفعّل على الموقع</span>
            <Switch
              checked={form.is_active}
              onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>

          {formError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 rounded-xl px-4 text-sm dark:text-slate-200 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-70"
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
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-white">حذف القائمة</h3>
            <p className="mt-2 text-sm text-slate-400">
              هل أنت متأكد من حذف قائمة التشغيل؟
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="h-10 rounded-xl px-4 text-sm text-slate-300 hover:bg-white/5"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-70"
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