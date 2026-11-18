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
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  createGrade,
  createStage,
  createUnit,
  deleteGrade,
  deleteStage,
  deleteUnit,
  getAcademicTree,
  toggleGradeActive,
  toggleStageActive,
  toggleUnitActive,
  updateGrade,
  updateStage,
  updateUnit,
} from "@/app/admin/academic/actions";
import type {
  AcademicGrade,
  AcademicStage,
  AcademicUnit,
} from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

type Tab = "stages" | "grades" | "units";

export function AcademicStructureManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("stages");
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [units, setUnits] = useState<AcademicUnit[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: Tab;
    id: string;
    label: string;
  } | null>(null);

  const [editingStage, setEditingStage] = useState<AcademicStage | null>(null);
  const [editingGrade, setEditingGrade] = useState<AcademicGrade | null>(null);
  const [editingUnit, setEditingUnit] = useState<AcademicUnit | null>(null);

  const [name, setName] = useState("");
  const [parentStageId, setParentStageId] = useState("");
  const [parentGradeId, setParentGradeId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAcademicTree();
      if (result.success && result.data) {
        setStages(result.data.stages);
        setGrades(result.data.grades);
        setUnits(result.data.units);
      } else if (!result.success) {
        error(result.error || "تعذر تحميل الهيكل الأكاديمي");
      }
    } catch (err) {
      console.error("[academic-manager] load:", err);
      error("تعذر تحميل الهيكل الأكاديمي");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  const gradesForParent = useMemo(
    () =>
      parentStageId
        ? grades.filter((g) => g.stage_id === parentStageId)
        : grades,
    [grades, parentStageId]
  );

  function openCreate(kind: Tab) {
    setFormError(null);
    setName("");
    setEditingStage(null);
    setEditingGrade(null);
    setEditingUnit(null);
    setParentStageId(stages[0]?.id ?? "");
    setParentGradeId("");
    setTab(kind);
    setModalOpen(true);
  }

  function openEditStage(item: AcademicStage) {
    setEditingStage(item);
    setEditingGrade(null);
    setEditingUnit(null);
    setName(item.name);
    setFormError(null);
    setTab("stages");
    setModalOpen(true);
  }

  function openEditGrade(item: AcademicGrade) {
    setEditingGrade(item);
    setEditingStage(null);
    setEditingUnit(null);
    setName(item.name);
    setParentStageId(item.stage_id);
    setFormError(null);
    setTab("grades");
    setModalOpen(true);
  }

  function openEditUnit(item: AcademicUnit) {
    setEditingUnit(item);
    setEditingStage(null);
    setEditingGrade(null);
    setName(item.name);
    const grade = grades.find((g) => g.id === item.grade_id);
    setParentGradeId(item.grade_id);
    setParentStageId(grade?.stage_id ?? "");
    setFormError(null);
    setTab("units");
    setModalOpen(true);
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("الاسم مطلوب");
      return;
    }

    startTransition(async () => {
      try {
        if (tab === "stages") {
          const result = editingStage
            ? await updateStage(editingStage.id, name)
            : await createStage(name);
          if (result.success && result.data) {
            setStages((prev) =>
              editingStage
                ? prev.map((s) =>
                    s.id === editingStage.id ? result.data! : s
                  )
                : [...prev, result.data!]
            );
            setModalOpen(false);
            success(result.message ?? "تم الحفظ");
          } else if (!result.success) {
            setFormError(result.error);
            error(result.error);
          }
          return;
        }

        if (tab === "grades") {
          if (!parentStageId) {
            setFormError("اختر المرحلة");
            return;
          }
          const result = editingGrade
            ? await updateGrade(editingGrade.id, parentStageId, name)
            : await createGrade(parentStageId, name);
          if (result.success && result.data) {
            setGrades((prev) =>
              editingGrade
                ? prev.map((g) =>
                    g.id === editingGrade.id ? result.data! : g
                  )
                : [...prev, result.data!]
            );
            setModalOpen(false);
            success(result.message ?? "تم الحفظ");
          } else if (!result.success) {
            setFormError(result.error);
            error(result.error);
          }
          return;
        }

        if (!parentGradeId) {
          setFormError("اختر الصف");
          return;
        }
        const result = editingUnit
          ? await updateUnit(editingUnit.id, parentGradeId, name)
          : await createUnit(parentGradeId, name);
        if (result.success && result.data) {
          setUnits((prev) =>
            editingUnit
              ? prev.map((u) =>
                  u.id === editingUnit.id ? result.data! : u
                )
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[academic-manager] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const { kind, id } = deleteTarget;
    setDeleteTarget(null);

    startTransition(async () => {
      try {
        const result =
          kind === "stages"
            ? await deleteStage(id)
            : kind === "grades"
              ? await deleteGrade(id)
              : await deleteUnit(id);

        if (result.success) {
          if (kind === "stages") {
            setStages((prev) => prev.filter((s) => s.id !== id));
            setGrades((prev) => prev.filter((g) => g.stage_id !== id));
          } else if (kind === "grades") {
            setGrades((prev) => prev.filter((g) => g.id !== id));
            setUnits((prev) => prev.filter((u) => u.grade_id !== id));
          } else {
            setUnits((prev) => prev.filter((u) => u.id !== id));
          }
          success(result.message ?? "تم الحذف");
        } else {
          error(result.error);
        }
      } catch (err) {
        console.error("[academic-manager] delete:", err);
        error("تعذر الحذف");
      }
    });
  }

  function stageName(id: string) {
    return stages.find((s) => s.id === id)?.name ?? "—";
  }
  function gradeName(id: string) {
    return grades.find((g) => g.id === id)?.name ?? "—";
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        جاري تحميل الهيكل الأكاديمي...
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "stages", label: "المراحل", count: stages.length },
    { id: "grades", label: "الصفوف", count: grades.length },
    { id: "units", label: "الوحدات", count: units.length },
  ];

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-300/90">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm font-semibold">الهيكل الأكاديمي</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            المراحل · الصفوف · الوحدات
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            بناء شجرة المنهج الدراسي لربط المواد وقوائم الفيديو
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate(tab)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition hover:from-teal-600 hover:to-teal-500"
        >
          <Plus className="h-4 w-4" />
          إضافة{" "}
          {tab === "stages" ? "مرحلة" : tab === "grades" ? "صف" : "وحدة"}
        </button>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
              tab === t.id
                ? "bg-teal-600 text-white shadow"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.label}
            <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-[11px]">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-black/40 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-slate-300">
          <Layers className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-medium">
            {tab === "stages"
              ? "المراحل الدراسية"
              : tab === "grades"
                ? "الصفوف المرتبطة بالمراحل"
                : "الوحدات المرتبطة بالصفوف"}
          </span>
        </div>

        <div className="space-y-2">
          {tab === "stages" &&
            (stages.length === 0 ? (
              <EmptyState text="لا توجد مراحل بعد" />
            ) : (
              stages.map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  subtitle="مرحلة دراسية"
                  active={item.is_active}
                  pending={pending}
                  onToggle={(v) =>
                    startTransition(async () => {
                      setStages((prev) =>
                        prev.map((s) =>
                          s.id === item.id ? { ...s, is_active: v } : s
                        )
                      );
                      const result = await toggleStageActive(item.id, v);
                      if (result.success && result.data) {
                        setStages((prev) =>
                          prev.map((s) =>
                            s.id === item.id ? result.data! : s
                          )
                        );
                        success(result.message ?? "تم");
                      } else if (!result.success) {
                        setStages((prev) =>
                          prev.map((s) =>
                            s.id === item.id
                              ? { ...s, is_active: !v }
                              : s
                          )
                        );
                        error(result.error);
                      }
                    })
                  }
                  onEdit={() => openEditStage(item)}
                  onDelete={() =>
                    setDeleteTarget({
                      kind: "stages",
                      id: item.id,
                      label: item.name,
                    })
                  }
                />
              ))
            ))}

          {tab === "grades" &&
            (grades.length === 0 ? (
              <EmptyState text="لا توجد صفوف بعد" />
            ) : (
              grades.map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  subtitle={`المرحلة: ${stageName(item.stage_id)}`}
                  active={item.is_active}
                  pending={pending}
                  onToggle={(v) =>
                    startTransition(async () => {
                      setGrades((prev) =>
                        prev.map((g) =>
                          g.id === item.id ? { ...g, is_active: v } : g
                        )
                      );
                      const result = await toggleGradeActive(item.id, v);
                      if (result.success && result.data) {
                        setGrades((prev) =>
                          prev.map((g) =>
                            g.id === item.id ? result.data! : g
                          )
                        );
                        success(result.message ?? "تم");
                      } else if (!result.success) {
                        setGrades((prev) =>
                          prev.map((g) =>
                            g.id === item.id
                              ? { ...g, is_active: !v }
                              : g
                          )
                        );
                        error(result.error);
                      }
                    })
                  }
                  onEdit={() => openEditGrade(item)}
                  onDelete={() =>
                    setDeleteTarget({
                      kind: "grades",
                      id: item.id,
                      label: item.name,
                    })
                  }
                />
              ))
            ))}

          {tab === "units" &&
            (units.length === 0 ? (
              <EmptyState text="لا توجد وحدات بعد" />
            ) : (
              units.map((item) => (
                <Row
                  key={item.id}
                  title={item.name}
                  subtitle={`الصف: ${gradeName(item.grade_id)}`}
                  active={item.is_active}
                  pending={pending}
                  onToggle={(v) =>
                    startTransition(async () => {
                      setUnits((prev) =>
                        prev.map((u) =>
                          u.id === item.id ? { ...u, is_active: v } : u
                        )
                      );
                      const result = await toggleUnitActive(item.id, v);
                      if (result.success && result.data) {
                        setUnits((prev) =>
                          prev.map((u) =>
                            u.id === item.id ? result.data! : u
                          )
                        );
                        success(result.message ?? "تم");
                      } else if (!result.success) {
                        setUnits((prev) =>
                          prev.map((u) =>
                            u.id === item.id
                              ? { ...u, is_active: !v }
                              : u
                          )
                        );
                        error(result.error);
                      }
                    })
                  }
                  onEdit={() => openEditUnit(item)}
                  onDelete={() =>
                    setDeleteTarget({
                      kind: "units",
                      id: item.id,
                      label: item.name,
                    })
                  }
                />
              ))
            ))}
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingStage || editingGrade || editingUnit
            ? "تعديل"
            : tab === "stages"
              ? "إضافة مرحلة"
              : tab === "grades"
                ? "إضافة صف"
                : "إضافة وحدة"
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {tab === "grades" ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">المرحلة</span>
              <select
                value={parentStageId}
                onChange={(e) => setParentStageId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                required
              >
                <option value="">اختر المرحلة</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {tab === "units" ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">المرحلة</span>
                <select
                  value={parentStageId}
                  onChange={(e) => {
                    setParentStageId(e.target.value);
                    setParentGradeId("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">اختر المرحلة</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">الصف</span>
                <select
                  value={parentGradeId}
                  onChange={(e) => setParentGradeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                >
                  <option value="">اختر الصف</option>
                  {gradesForParent.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">الاسم</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                tab === "stages"
                  ? "مثال: المرحلة الثانوية"
                  : tab === "grades"
                    ? "مثال: الصف الأول"
                    : "مثال: الوحدة الأولى"
              }
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          {formError ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
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

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="إلغاء"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl sm:p-8">
            <h3 className="text-lg font-bold text-white">تأكيد الحذف</h3>
            <p className="mt-2 text-sm text-slate-400">
              هل أنت متأكد من حذف «{deleteTarget.label}»؟ الحذف قد يؤثر على
              العناصر المرتبطة.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function Row({
  title,
  subtitle,
  active,
  pending,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  pending: boolean;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-teal-500/30 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Switch
          checked={active}
          onChange={onToggle}
          label={active ? "مفعّل" : "متوقف"}
          disabled={pending}
        />
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10"
          aria-label="تعديل"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400 transition hover:bg-rose-500/10"
          aria-label="حذف"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}