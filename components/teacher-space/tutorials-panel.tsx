"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { CirclePlay, ExternalLink, ImagePlus, X } from "lucide-react";
import {
  createTutorial,
  deleteTutorial,
  getTutorials,
  toggleTutorialActive,
  updateTutorial,
} from "@/app/admin/teacher-space/actions";
import { isValidYoutubeUrl } from "@/lib/academic";
import { safeExternalHref } from "@/lib/social";
import { uploadPlaylistCover } from "@/lib/storage";
import type { TeacherTutorial } from "@/lib/types";
import { StageGradeFields } from "@/components/teacher-space/stage-grade-fields";
import {
  ActiveField,
  AddButton,
  DeleteDialog,
  FormActions,
  FormError,
  ListShell,
  RowActions,
  SectionLoading,
  gradeName,
  rowClass,
  selectClass,
  stageName,
  type StageGradeProps,
} from "@/components/teacher-space/panel-ui";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  title: "",
  youtube_url: "",
  cover_image_url: "",
  stage_id: "",
  grade_id: "",
  is_active: true,
};

export function TutorialsPanel({ stages, grades }: StageGradeProps) {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TeacherTutorial[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeacherTutorial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTutorials();
      if (result.success && result.data) setItems(result.data);
      else if (!result.success) error(result.error);
    } catch (err) {
      console.error("[tutorials-panel] load:", err);
      error("تعذر تحميل الشروحات");
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

  function openEdit(item: TeacherTutorial) {
    setEditing(item);
    setForm({
      title: item.title,
      youtube_url: item.youtube_url,
      cover_image_url: item.cover_image_url ?? "",
      stage_id: item.stage_id ?? "",
      grade_id: item.grade_id ?? "",
      is_active: item.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleCover(file: File | null) {
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
      console.error("[tutorials-panel] cover:", err);
      const message = err instanceof Error ? err.message : "فشل رفع الغلاف";
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
    if (!isValidYoutubeUrl(form.youtube_url)) {
      setFormError("رابط يوتيوب غير صالح");
      return;
    }
    if (!form.stage_id || !form.grade_id) {
      setFormError("اختر المرحلة والصف");
      return;
    }
    const payload = {
      ...form,
      cover_image_url: form.cover_image_url.trim() || null,
    };
    startTransition(async () => {
      try {
        const result = editing
          ? await updateTutorial(editing.id, payload)
          : await createTutorial(payload);
        if (result.success && result.data) {
          setItems((prev) =>
            editing
              ? prev.map((x) => (x.id === editing.id ? result.data! : x))
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[tutorials-panel] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function handleToggle(id: string, is_active: boolean) {
    const previous = items;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_active } : x)));
    startTransition(async () => {
      try {
        const result = await toggleTutorialActive(id, is_active);
        if (result.success && result.data) {
          setItems((prev) => prev.map((x) => (x.id === id ? result.data! : x)));
          success(result.message ?? "تم");
        } else if (!result.success) {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[tutorials-panel] toggle:", err);
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
      setItems((prev) => prev.filter((x) => x.id !== id));
      try {
        const result = await deleteTutorial(id);
        if (result.success) success(result.message ?? "تم الحذف");
        else {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[tutorials-panel] delete:", err);
        setItems(previous);
        error("تعذر الحذف");
      }
    });
  }

  if (loading) return <SectionLoading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddButton label="إضافة شرح" onClick={openCreate} />
      </div>
      <ListShell empty={items.length === 0} emptyText="لا توجد شروحات بعد">
        {items.map((item) => {
          const href = safeExternalHref(item.youtube_url);
          return (
            <article key={item.id} className={rowClass}>
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
                  <p className="truncate font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {stageName(stages, item.stage_id)} ·{" "}
                    {gradeName(grades, item.grade_id)}
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
              </div>
              <RowActions
                isActive={item.is_active}
                pending={pending}
                onToggle={(v) => handleToggle(item.id, v)}
                onEdit={() => openEdit(item)}
                onDelete={() => setDeleteId(item.id)}
              />
            </article>
          );
        })}
      </ListShell>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل شرح" : "إضافة شرح"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">العنوان</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="عنوان الشرح"
              className={selectClass}
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
              placeholder="https://www.youtube.com/watch?v=..."
              className={selectClass}
            />
          </label>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <span className="text-sm font-medium">غلاف (اختياري)</span>
            {form.cover_image_url ? (
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.cover_image_url}
                  alt=""
                  className="h-32 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                  className="absolute start-2 top-2 inline-flex h-8 items-center gap-1 rounded-lg bg-black/70 px-2 text-xs text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  إزالة
                </button>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 px-3 text-sm font-semibold text-teal-300">
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
                    void handleCover(file);
                  }}
                />
              </label>
              <input
                value={form.cover_image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cover_image_url: e.target.value }))
                }
                placeholder="أو رابط صورة"
                className={selectClass}
              />
            </div>
          </div>
          <StageGradeFields
            stages={stages}
            grades={grades}
            stageId={form.stage_id}
            gradeId={form.grade_id}
            onStageChange={(id) => setForm((f) => ({ ...f, stage_id: id }))}
            onGradeChange={(id) => setForm((f) => ({ ...f, grade_id: id }))}
          />
          <ActiveField
            checked={form.is_active}
            onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
          <FormError message={formError} />
          <FormActions
            pending={pending}
            disabled={uploadingCover}
            onCancel={() => setModalOpen(false)}
          />
        </form>
      </Modal>

      <DeleteDialog
        open={!!deleteId}
        title="حذف الشرح"
        message="هل أنت متأكد من حذف هذا الشرح؟"
        pending={pending}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
