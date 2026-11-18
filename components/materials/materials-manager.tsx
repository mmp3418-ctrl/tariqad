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
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import {
  createMaterial,
  deleteMaterial,
  getMaterials,
  toggleMaterialActive,
  updateMaterial,
} from "@/app/admin/materials/actions";
import { MATERIAL_TYPE_OPTIONS, materialTypeLabel } from "@/lib/academic";
import { uploadMaterialPdf } from "@/lib/storage";
import { safeExternalHref } from "@/lib/social";
import type {
  AcademicGrade,
  AcademicStage,
  EducationalMaterial,
  MaterialType,
} from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const selectClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const emptyForm = {
  title: "",
  unit_name: "",
  material_type: "كتاب حصة" as MaterialType,
  file_path: "",
  stage_id: "",
  grade_id: "",
  is_active: true,
};

export function MaterialsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<EducationalMaterial[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EducationalMaterial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fileName, setFileName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
      const [tree, mats] = await Promise.all([
        getAcademicTree(),
        getMaterials(),
      ]);
      if (tree.success && tree.data) {
        setStages(tree.data.stages);
        setGrades(tree.data.grades);
      } else if (!tree.success) {
        error(tree.error);
      }
      if (mats.success && mats.data) {
        setItems(mats.data);
      } else if (!mats.success) {
        error(mats.error);
      }
    } catch (err) {
      console.error("[materials-manager] load:", err);
      error("تعذر تحميل المواد التعليمية");
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

  function openEdit(item: EducationalMaterial) {
    setEditing(item);
    setForm({
      title: item.title,
      unit_name: item.unit_name,
      material_type: item.material_type,
      file_path: item.file_path,
      stage_id: item.stage_id ?? "",
      grade_id: item.grade_id ?? "",
      is_active: item.is_active,
    });
    setFileName(item.file_path ? "ملف محفوظ" : null);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setFormError(null);
    setUploading(true);
    try {
      const result = await uploadMaterialPdf(file);
      if (result.success && result.data) {
        setForm((f) => ({ ...f, file_path: result.data!.publicUrl }));
        setFileName(file.name);
        success(
          result.message ??
            `تم رفع ملف PDF إلى «${result.data.bucket}» بنجاح`
        );
      } else if (!result.success) {
        setFormError(result.error);
        error(result.error);
      }
    } catch (err) {
      console.error("[materials-manager] upload:", err);
      const message =
        err instanceof Error ? err.message : "فشل رفع الملف";
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
    if (!form.unit_name.trim()) {
      setFormError("اسم الوحدة مطلوب");
      return;
    }
    if (!form.stage_id || !form.grade_id) {
      setFormError("اختر المرحلة والصف");
      return;
    }
    if (!form.file_path.trim()) {
      setFormError("يجب رفع ملف PDF");
      return;
    }

    startTransition(async () => {
      try {
        const result = editing
          ? await updateMaterial(editing.id, form)
          : await createMaterial(form);
        if (result.success && result.data) {
          setItems((prev) =>
            editing
              ? prev.map((m) => (m.id === editing.id ? result.data! : m))
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[materials-manager] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function handleToggle(id: string, is_active: boolean) {
    const previous = items;
    setItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_active } : m))
    );
    startTransition(async () => {
      try {
        const result = await toggleMaterialActive(id, is_active);
        if (result.success && result.data) {
          setItems((prev) =>
            prev.map((m) => (m.id === id ? result.data! : m))
          );
          success(result.message ?? "تم");
        } else if (!result.success) {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[materials-manager] toggle:", err);
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
      setItems((prev) => prev.filter((m) => m.id !== id));
      try {
        const result = await deleteMaterial(id);
        if (result.success) success(result.message ?? "تم الحذف");
        else {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[materials-manager] delete:", err);
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
        جاري تحميل المواد التعليمية...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-300/90">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-semibold">المحتوى التعليمي</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            المواد التعليمية
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            رفع PDF مباشرة إلى التخزين مع ربط المرحلة والصف واسم الوحدة
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition hover:from-teal-600 hover:to-teal-500"
        >
          <Plus className="h-4 w-4" />
          إضافة مادة
        </button>
      </header>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-black/40 sm:p-6">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">
              لا توجد مواد بعد — أضف أول ملف PDF
            </div>
          ) : (
            items.map((item) => {
              const href = safeExternalHref(item.file_path);
              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-teal-500/30 sm:flex-row sm:items-center sm:justify-between"
                >
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
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        فتح PDF
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
        title={editing ? "تعديل مادة" : "إضافة مادة تعليمية"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">العنوان</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="عنوان المادة"
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

          <div className="space-y-2">
            <span className="text-sm font-medium">رفع ملف PDF</span>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 px-4 py-6 text-center transition hover:border-teal-400 hover:bg-teal-500/10">
              <Upload className="h-6 w-6 text-teal-400" />
              <span className="text-sm font-medium text-slate-200">
                {uploading
                  ? "جاري الرفع إلى التخزين..."
                  : "اضغط لاختيار ملف PDF"}
              </span>
              {fileName ? (
                <span className="text-xs text-teal-300">{fileName}</span>
              ) : null}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={uploading || pending}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void handleFileChange(file);
                  e.target.value = "";
                }}
              />
            </label>
            {form.file_path ? (
              <a
                href={form.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                معاينة الملف المرفوع
              </a>
            ) : null}
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
              disabled={pending || uploading}
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
            <h3 className="text-lg font-bold text-white">حذف المادة</h3>
            <p className="mt-2 text-sm text-slate-400">
              هل أنت متأكد من حذف هذه المادة التعليمية؟
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