"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { BookMarked, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import {
  createSubject,
  deleteSubject,
  getSubjects,
  updateSubject,
} from "@/app/admin/subjects/actions";
import type { AcademicGrade, AcademicStage, Subject } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { arabicDbError } from "@/lib/ids";

const field =
  "w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-600";

const emptyForm = {
  name_ar: "",
  name_en: "",
  stage: "",
  grade: "",
};

type SubjectsPanelProps = {
  onSubjectsChange?: (subjects: Subject[]) => void;
};

export function SubjectsPanel({ onSubjectsChange }: SubjectsPanelProps) {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [filterStage, setFilterStage] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const filterGrades = useMemo(
    () =>
      grades.filter(
        (g) =>
          (!filterStage || g.stage_id === filterStage) && g.is_active !== false,
      ),
    [grades, filterStage],
  );

  const formGrades = useMemo(
    () =>
      grades.filter(
        (g) => g.stage_id === form.stage && g.is_active !== false,
      ),
    [grades, form.stage],
  );

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      if (filterStage && s.stage !== filterStage) return false;
      if (filterGrade && s.grade !== filterGrade) return false;
      return true;
    });
  }, [subjects, filterStage, filterGrade]);

  const grouped = useMemo(() => {
    const map = new Map<string, Subject[]>();
    for (const s of filtered) {
      const key = `${s.stage}::${s.grade}`;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tree, list] = await Promise.all([
        getAcademicTree(),
        getSubjects(),
      ]);
      if (tree.success && tree.data) {
        setStages(tree.data.stages);
        setGrades(tree.data.grades);
      }
      if (list.success && list.data) {
        setSubjects(list.data);
        onSubjectsChange?.(list.data);
      } else if (!list.success) {
        error(arabicDbError(list.error));
      }
    } catch (err) {
      console.error("[subjects-panel] load:", err);
      error("تعذّر تحميل المواد الدراسية، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  }, [error, onSubjectsChange]);

  useEffect(() => {
    void load();
  }, [load]);

  function stageName(id: string) {
    return stages.find((s) => s.id === id)?.name ?? "—";
  }
  function gradeName(id: string) {
    return grades.find((g) => g.id === id)?.name ?? "—";
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: Subject) {
    setEditing(item);
    setForm({
      name_ar: item.name_ar,
      name_en: item.name_en ?? "",
      stage: item.stage,
      grade: item.grade,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name_ar.trim()) {
      setFormError("اسم المادة بالعربية مطلوب");
      return;
    }
    if (!form.stage || !form.grade) {
      setFormError("يرجى اختيار المرحلة والصف قبل الحفظ.");
      return;
    }

    startTransition(async () => {
      try {
        const result = editing
          ? await updateSubject(editing.id, form)
          : await createSubject(form);
        if (result.success && result.data) {
          setSubjects((prev) => {
            const next = editing
              ? prev.map((s) => (s.id === editing.id ? result.data! : s))
              : [...prev, result.data!];
            onSubjectsChange?.(next);
            return next;
          });
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[subjects-panel] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    const prev = subjects;
    setDeleteId(null);
    setSubjects((rows) => {
      const next = rows.filter((s) => s.id !== id);
      onSubjectsChange?.(next);
      return next;
    });
    startTransition(async () => {
      try {
        const result = await deleteSubject(id);
        if (result.success) {
          success(result.message ?? "تم الحذف");
        } else {
          setSubjects(prev);
          onSubjectsChange?.(prev);
          error(result.error);
        }
      } catch (err) {
        console.error("[subjects-panel] delete:", err);
        setSubjects(prev);
        onSubjectsChange?.(prev);
        error("تعذّر حذف المادة الدراسية");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-black/40 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
            <BookMarked className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-white">
              إدارة المواد الدراسية
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              صِف كل مادة دراسية بمرحلة وصف (مثل الرياضيات، الفيزياء)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus className="h-4 w-4" />
          إضافة مادة دراسية
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-400">تصفية المرحلة</span>
          <select
            value={filterStage}
            onChange={(e) => {
              setFilterStage(e.target.value);
              setFilterGrade("");
            }}
            className={field}
          >
            <option value="">كل المراحل</option>
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
          <span className="text-xs font-medium text-slate-400">تصفية الصف</span>
          <select
            value={filterGrade}
            disabled={!filterStage}
            onChange={(e) => setFilterGrade(e.target.value)}
            className={`${field} disabled:opacity-40`}
          >
            <option value="">كل الصفوف</option>
            {filterGrades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">
          جاري تحميل المواد الدراسية…
        </p>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">
          لا توجد مواد دراسية بعد — أضف أول مادة مرتبطة بمرحلة وصف
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, rows]) => {
            const [stageId, gradeId] = key.split("::");
            return (
              <div key={key} className="space-y-2">
                <p className="text-xs font-semibold text-teal-300/90">
                  {stageName(stageId)} · {gradeName(gradeId)}
                </p>
                {rows.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{item.name_ar}</p>
                      {item.name_en ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.name_en}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="تعديل"
                        onClick={() => openEdit(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="حذف"
                        onClick={() => setDeleteId(item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل مادة دراسية" : "إضافة مادة دراسية"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">اسم المادة بالعربية</span>
            <input
              value={form.name_ar}
              required
              placeholder="الرياضيات"
              onChange={(e) =>
                setForm((f) => ({ ...f, name_ar: e.target.value }))
              }
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              اسم المادة بالإنجليزية (اختياري)
            </span>
            <input
              value={form.name_en}
              placeholder="Mathematics"
              onChange={(e) =>
                setForm((f) => ({ ...f, name_en: e.target.value }))
              }
              className={field}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">المرحلة</span>
              <select
                value={form.stage}
                required
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    stage: e.target.value,
                    grade: "",
                  }))
                }
                className={field}
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
                value={form.grade}
                required
                disabled={!form.stage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, grade: e.target.value }))
                }
                className={`${field} disabled:opacity-40`}
              >
                <option value="">اختر الصف</option>
                {formGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {formError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {formError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 px-4 text-sm text-slate-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h3 className="font-bold text-white">حذف المادة الدراسية</h3>
            <p className="mt-2 text-sm text-slate-400">
              سيتم فك ارتباط الملفات والقوائم المرتبطة بهذه المادة.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="h-10 px-4 text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmDelete}
                className="h-10 rounded-xl bg-rose-600 px-4 text-white disabled:opacity-60"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
