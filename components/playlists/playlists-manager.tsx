"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  ExternalLink,
  Pencil,
  Plus,
  Save,
  Trash2,
  CirclePlay,
} from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import {
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  togglePlaylistActive,
  updatePlaylist,
} from "@/app/admin/playlists/actions";
import { isValidYoutubeUrl } from "@/lib/academic";
import { safeExternalHref } from "@/lib/social";
import type {
  AcademicGrade,
  AcademicStage,
  AcademicUnit,
  VideoPlaylist,
} from "@/lib/types";
import {
  AcademicCascadeSelects,
  resolveAcademicLabels,
} from "@/components/academic/cascade-selects";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  title: "",
  youtube_url: "",
  stage_id: "",
  grade_id: "",
  unit_id: "",
  is_active: true,
};

export function PlaylistsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VideoPlaylist[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [units, setUnits] = useState<AcademicUnit[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VideoPlaylist | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

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
        setUnits(tree.data.units);
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
      error("تعذر تحميل قوائم الفيديو");
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
      youtube_url: item.youtube_url,
      stage_id: item.stage_id ?? "",
      grade_id: item.grade_id ?? "",
      unit_id: item.unit_id ?? "",
      is_active: item.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("العنوان مطلوب");
      return;
    }
    if (!isValidYoutubeUrl(form.youtube_url)) {
      setFormError("رابط يوتيوب غير صالح");
      return;
    }
    if (!form.stage_id || !form.grade_id || !form.unit_id) {
      setFormError("اختر المرحلة والصف والوحدة");
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
    startTransition(async () => {
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active } : p))
      );
      try {
        const result = await togglePlaylistActive(id, is_active);
        if (result.success && result.data) {
          setItems((prev) =>
            prev.map((p) => (p.id === id ? result.data! : p))
          );
          success(result.message ?? "تم");
        } else if (!result.success) {
          setItems((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, is_active: !is_active } : p
            )
          );
          error(result.error);
        }
      } catch (err) {
        console.error("[playlists-manager] toggle:", err);
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        جاري تحميل قوائم الفيديو...
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
          <h2 className="text-2xl font-extrabold text-white">
            قوائم فيديو يوتيوب
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            ربط قوائم التشغيل بالمرحلة والصف والوحدة
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
              لا توجد قوائم بعد — أضف أول قائمة يوتيوب
            </div>
          ) : (
            items.map((item) => {
              const labels = resolveAcademicLabels(
                stages,
                grades,
                units,
                item.stage_id,
                item.grade_id,
                item.unit_id
              );
              const href = safeExternalHref(item.youtube_url);
              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-teal-500/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {labels.stage} · {labels.grade} · {labels.unit}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-teal-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.youtube_url}</span>
                      </a>
                    ) : null}
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
        title={editing ? "تعديل قائمة" : "إضافة قائمة فيديو"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">العنوان</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="عنوان الشرح / القائمة"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">رابط يوتيوب</span>
            <input
              value={form.youtube_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, youtube_url: e.target.value }))
              }
              required
              placeholder="https://www.youtube.com/playlist?list=..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-3 text-xs font-semibold text-slate-500">
              الربط الأكاديمي
            </p>
            <AcademicCascadeSelects
              stages={stages}
              grades={grades}
              units={units}
              stageId={form.stage_id}
              gradeId={form.grade_id}
              unitId={form.unit_id}
              onStageChange={(id) =>
                setForm((f) => ({
                  ...f,
                  stage_id: id,
                  grade_id: "",
                  unit_id: "",
                }))
              }
              onGradeChange={(id) =>
                setForm((f) => ({ ...f, grade_id: id, unit_id: "" }))
              }
              onUnitChange={(id) => setForm((f) => ({ ...f, unit_id: id }))}
            />
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
              هل أنت متأكد من حذف قائمة الفيديو؟
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