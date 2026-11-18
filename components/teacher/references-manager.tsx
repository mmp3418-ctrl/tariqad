"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BookMarked, ExternalLink, Pencil, Plus, Save, Trash2, Upload } from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import {
  createReference,
  deleteReference,
  getReferences,
  toggleReferenceActive,
  updateReference,
} from "@/app/admin/teacher/references/actions";
import { uploadMaterialPdf } from "@/lib/storage";
import { safeExternalHref } from "@/lib/social";
import type { AcademicGrade, AcademicStage, TeacherReference } from "@/lib/types";
import { StageGradeFields } from "@/components/teacher-space/stage-grade-fields";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const selectClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const emptyForm = {
  title: "",
  description: "",
  file_url: "",
  stage_id: "",
  grade_id: "",
  is_active: true,
};

export function ReferencesManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<TeacherReference[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeacherReference | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fileName, setFileName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tree, list] = await Promise.all([getAcademicTree(), getReferences()]);
      if (tree.success && tree.data) {
        setStages(tree.data.stages);
        setGrades(tree.data.grades);
      } else if (!tree.success) error(tree.error);
      if (list.success && list.data) setItems(list.data);
      else if (!list.success) error(list.error);
    } catch (err) {
      console.error("[references-manager] load:", err);
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

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const result = await uploadMaterialPdf(file);
      if (result.success && result.data) {
        setForm((current) => ({ ...current, file_url: result.data!.publicUrl }));
        setFileName(file.name);
        success(result.message ?? "تم رفع ملف PDF");
      } else if (!result.success) {
        setFormError(result.error);
        error(result.error);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.stage_id || !form.grade_id || !form.file_url.trim()) {
      setFormError(!form.file_url.trim() ? "يجب رفع ملف PDF" : "أكمل العنوان والمرحلة والصف");
      return;
    }
    startTransition(async () => {
      const result = editing ? await updateReference(editing.id, form) : await createReference(form);
      if (result.success && result.data) {
        setItems((prev) =>
          editing ? prev.map((item) => (item.id === editing.id ? result.data! : item)) : [...prev, result.data!]
        );
        setModalOpen(false);
        success(result.message ?? "تم الحفظ");
      } else if (!result.success) {
        setFormError(result.error);
        error(result.error);
      }
    });
  }

  function handleToggle(id: string, is_active: boolean) {
    const previous = items;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_active } : item)));
    startTransition(async () => {
      const result = await toggleReferenceActive(id, is_active);
      if (result.success && result.data) {
        setItems((prev) => prev.map((item) => (item.id === id ? result.data! : item)));
        success(result.message ?? "تم");
      } else if (!result.success) {
        setItems(previous);
        error(result.error);
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const previous = items;
    setItems((prev) => prev.filter((item) => item.id !== id));
    startTransition(async () => {
      const result = await deleteReference(id);
      if (result.success) success(result.message ?? "تم الحذف");
      else {
        setItems(previous);
        error(result.error);
      }
    });
  }

  const stageName = (id: string | null) => stages.find((stage) => stage.id === id)?.name ?? "—";
  const gradeName = (id: string | null) => grades.find((grade) => grade.id === id)?.name ?? "—";

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-400">جاري تحميل المراجع...</div>;
  }

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/teacher" className="mb-1 flex items-center gap-2 text-sm font-semibold text-teal-300/90 hover:text-teal-200">
            <BookMarked className="h-5 w-5" />
            مساحة المعلم
          </Link>
          <h2 className="text-2xl font-extrabold text-white">مرجع المعلمين</h2>
          <p className="mt-1 text-sm text-slate-400">ملفات PDF مرجعية مرتبطة بالمرحلة والصف</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" />
          إضافة مرجع
        </button>
      </header>
      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-black/40 sm:p-6">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">لا توجد مراجع بعد — أضف أول ملف PDF</div>
          ) : (
            items.map((item) => {
              const href = safeExternalHref(item.file_url);
              return (
                <article key={item.id} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {stageName(item.stage_id)} · {gradeName(item.grade_id)}
                      {item.description ? ` · ${item.description}` : ""}
                    </p>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        فتح PDF
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch checked={item.is_active} onChange={(value) => handleToggle(item.id, value)} label={item.is_active ? "مفعّل" : "متوقف"} disabled={pending} />
                    <button type="button" onClick={() => openEdit(item)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10" aria-label="تعديل"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setDeleteId(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "تعديل مرجع" : "إضافة مرجع"}>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">العنوان</span>
            <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required className={selectClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">وصف مختصر (اختياري)</span>
            <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={3} className={selectClass} />
          </label>
          <StageGradeFields stages={stages} grades={grades} stageId={form.stage_id} gradeId={form.grade_id} onStageChange={(id) => setForm((current) => ({ ...current, stage_id: id, grade_id: "" }))} onGradeChange={(id) => setForm((current) => ({ ...current, grade_id: id }))} />
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 px-4 py-6 text-center">
            <Upload className="h-6 w-6 text-teal-400" />
            <span className="text-sm text-slate-200">{uploading ? "جاري الرفع..." : "رفع ملف PDF"}</span>
            {fileName ? <span className="text-xs text-teal-300">{fileName}</span> : null}
            <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={uploading || pending} onChange={(e) => { void handleFileChange(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          </label>
          <div className="flex items-center justify-between rounded-xl border border-slate-700 px-3 py-3">
            <span className="text-sm">مفعّل على الموقع</span>
            <Switch checked={form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
          </div>
          {formError ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="h-10 rounded-xl px-4 text-sm text-slate-200">إلغاء</button>
            <button type="submit" disabled={pending || uploading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-70"><Save className="h-4 w-4" />حفظ</button>
          </div>
        </form>
      </Modal>
      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <button type="button" className="absolute inset-0" aria-label="إلغاء" onClick={() => setDeleteId(null)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white">حذف المرجع</h3>
            <p className="mt-2 text-sm text-slate-400">هل أنت متأكد من حذف هذا المرجع؟</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteId(null)} className="h-10 rounded-xl px-4 text-sm text-slate-300">إلغاء</button>
              <button type="button" onClick={confirmDelete} className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white">تأكيد الحذف</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
