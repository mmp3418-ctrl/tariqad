"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { ExternalLink, FileText, Upload } from "lucide-react";
import {
  createReference,
  deleteReference,
  getReferences,
  toggleReferenceActive,
  updateReference,
} from "@/app/admin/teacher-space/actions";
import { safeExternalHref } from "@/lib/social";
import { uploadMaterialPdf } from "@/lib/storage";
import type { TeacherReference } from "@/lib/types";
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
  description: "",
  file_url: "",
  stage_id: "",
  grade_id: "",
  is_active: true,
};

export function ReferencesPanel({ stages, grades }: StageGradeProps) {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TeacherReference[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeacherReference | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReferences();
      if (result.success && result.data) setItems(result.data);
      else if (!result.success) error(result.error);
    } catch (err) {
      console.error("[references-panel] load:", err);
      error("تعذر تحميل المراجع");
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
    setFileName(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: TeacherReference) {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? "",
      file_url: item.file_url,
      stage_id: item.stage_id ?? "",
      grade_id: item.grade_id ?? "",
      is_active: item.is_active,
    });
    setFileName(item.file_url ? "ملف محفوظ" : null);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setFormError(null);
    setUploading(true);
    try {
      const result = await uploadMaterialPdf(file);
      if (result.success && result.data) {
        setForm((f) => ({ ...f, file_url: result.data!.publicUrl }));
        setFileName(file.name);
        success(result.message ?? "تم رفع PDF");
      } else if (!result.success) {
        setFormError(result.error);
        error(result.error);
      }
    } catch (err) {
      console.error("[references-panel] upload:", err);
      const message = err instanceof Error ? err.message : "فشل رفع الملف";
      setFormError(message);
      error(message);
    } finally {
      setUploading(false);
    }
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) {
      setFormError("العنوان مطلوب");
      return;
    }
    if (!form.file_url.trim()) {
      setFormError("يجب رفع ملف PDF");
      return;
    }
    if (!form.stage_id || !form.grade_id) {
      setFormError("اختر المرحلة والصف");
      return;
    }
    const payload = {
      ...form,
      description: form.description.trim() || null,
    };
    startTransition(async () => {
      try {
        const result = editing
          ? await updateReference(editing.id, payload)
          : await createReference(payload);
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
        console.error("[references-panel] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function handleToggle(id: string, is_active: boolean) {
    const previous = items;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_active } : x)));
    startTransition(async () => {
      try {
        const result = await toggleReferenceActive(id, is_active);
        if (result.success && result.data) {
          setItems((prev) => prev.map((x) => (x.id === id ? result.data! : x)));
          success(result.message ?? "تم");
        } else if (!result.success) {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[references-panel] toggle:", err);
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
        const result = await deleteReference(id);
        if (result.success) success(result.message ?? "تم الحذف");
        else {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[references-panel] delete:", err);
        setItems(previous);
        error("تعذر الحذف");
      }
    });
  }

  if (loading) return <SectionLoading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddButton label="إضافة مرجع" onClick={openCreate} />
      </div>
      <ListShell empty={items.length === 0} emptyText="لا توجد مراجع بعد">
        {items.map((item) => {
          const href = safeExternalHref(item.file_url);
          return (
            <article key={item.id} className={rowClass}>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {stageName(stages, item.stage_id)} ·{" "}
                  {gradeName(grades, item.grade_id)}
                </p>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    عرض PDF
                  </a>
                ) : null}
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
        title={editing ? "تعديل مرجع" : "إضافة مرجع"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">العنوان</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="عنوان المرجع"
              className={selectClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">الوصف</span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              placeholder="وصف مختصر للمرجع (اختياري)"
              className={selectClass}
            />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">رفع ملف PDF</span>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 px-4 py-6 text-center transition hover:border-teal-400 hover:bg-teal-500/10">
              <Upload className="h-6 w-6 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">
                {uploading ? "جاري الرفع إلى التخزين..." : "اضغط لاختيار ملف PDF"}
              </span>
              {fileName ? (
                <span className="inline-flex items-center gap-1 text-xs text-teal-300">
                  <FileText className="h-3.5 w-3.5" />
                  {fileName}
                </span>
              ) : null}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={uploading || pending}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void handleFile(file);
                }}
              />
            </label>
            {safeExternalHref(form.file_url) ? (
              <a
                href={safeExternalHref(form.file_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                معاينة الملف المرفوع
              </a>
            ) : null}
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
            disabled={uploading}
            onCancel={() => setModalOpen(false)}
          />
        </form>
      </Modal>

      <DeleteDialog
        open={!!deleteId}
        title="حذف المرجع"
        message="هل أنت متأكد من حذف هذا المرجع؟"
        pending={pending}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
