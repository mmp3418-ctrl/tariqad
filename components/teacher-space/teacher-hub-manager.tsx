"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Briefcase,
  Calculator,
  CalendarDays,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  Grade,
  TeacherSpaceCategory,
  TeacherSpaceItem,
  Unit,
} from "@/lib/types";
import { TEACHER_SPACE_CATEGORIES } from "@/lib/constants";
import { useLocale } from "@/lib/i18n";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import { getUnitsByGrade } from "@/app/(dashboard)/units/actions";
import {
  getSiteSettings,
  updateTeacherFeatureFlags,
} from "@/app/(dashboard)/settings/actions";
import {
  createTeacherSpaceItem,
  deleteTeacherSpaceItem,
  getTeacherSpaceItems,
  toggleTeacherSpaceActive,
  toggleTeacherSpaceComingSoon,
  updateTeacherSpaceItem,
} from "@/app/(dashboard)/teacher-space/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  category: "lesson_prep" as TeacherSpaceCategory,
  title_ar: "",
  description_ar: "",
  url: "",
  grade_id: "",
  unit_id: "",
  is_active: true,
  is_coming_soon: false,
};

export function TeacherHubManager() {
  const { t } = useLocale();
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [schedulesEnabled, setSchedulesEnabled] = useState(true);
  const [gradeCalcEnabled, setGradeCalcEnabled] = useState(true);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [formUnits, setFormUnits] = useState<Unit[]>([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"" | TeacherSpaceCategory>("");
  const [items, setItems] = useState<TeacherSpaceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherSpaceItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadFlags = useCallback(async () => {
    setLoadingFlags(true);
    const result = await getSiteSettings();
    if (result.success && result.data) {
      setSchedulesEnabled(result.data.schedules_enabled !== false);
      setGradeCalcEnabled(result.data.grade_calculator_enabled !== false);
    } else if (!result.success) error(result.error);
    setLoadingFlags(false);
  }, [error]);

  const loadGrades = useCallback(async () => {
    const result = await getGrades();
    if (result.success) setGrades(result.data ?? []);
  }, []);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    const result = await getTeacherSpaceItems({
      grade_id: gradeFilter || undefined,
      unit_id: unitFilter || undefined,
      category: categoryFilter || undefined,
    });
    if (result.success) setItems(result.data ?? []);
    else error(result.error);
    setLoadingItems(false);
  }, [gradeFilter, unitFilter, categoryFilter, error]);

  useEffect(() => {
    void loadFlags();
    void loadGrades();
  }, [loadFlags, loadGrades]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!gradeFilter) {
      setUnits([]);
      return;
    }
    void getUnitsByGrade(gradeFilter).then((r) => {
      if (r.success) setUnits(r.data ?? []);
    });
  }, [gradeFilter]);

  useEffect(() => {
    if (!form.grade_id) {
      setFormUnits([]);
      return;
    }
    void getUnitsByGrade(form.grade_id).then((r) => {
      if (r.success) setFormUnits(r.data ?? []);
    });
  }, [form.grade_id]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      grade_id: gradeFilter || "",
      unit_id: unitFilter || "",
      category: categoryFilter || "lesson_prep",
    });
    setModalOpen(true);
  }

  function openEdit(item: TeacherSpaceItem) {
    setEditing(item);
    setForm({
      category: item.category,
      title_ar: item.title_ar,
      description_ar: item.description_ar ?? "",
      url: item.url,
      grade_id: item.grade_id ?? "",
      unit_id: item.unit_id ?? "",
      is_active: item.is_active !== false,
      is_coming_soon: item.is_coming_soon,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.grade_id || !form.unit_id) {
      error("اختر الصف ثم الوحدة");
      return;
    }
    startTransition(async () => {
      const result = editing
        ? await updateTeacherSpaceItem(editing.id, form)
        : await createTeacherSpaceItem(form);
      if (result.success) {
        success(result.message ?? t.save);
        setModalOpen(false);
        await loadItems();
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="min-w-0">
        <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
          <Briefcase className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{t.hub.title}</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          {t.hub.title}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 ">{t.hub.subtitle}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-card flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
              <CalendarDays className="h-4 w-4" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                {t.hub.tabSchedules}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 ">{t.hub.schedulesHint}</p>
          </div>
          {loadingFlags ? (
            <span className="text-xs text-slate-600 dark:text-slate-400 ">{t.loading}</span>
          ) : (
            <Switch
              checked={schedulesEnabled}
              disabled={pending}
              label={schedulesEnabled ? t.active : t.inactive}
              onChange={(v) =>
                startTransition(async () => {
                  const r = await updateTeacherFeatureFlags({
                    schedules_enabled: v,
                  });
                  if (r.success) {
                    setSchedulesEnabled(v);
                    success(r.message ?? "");
                  } else error(r.error);
                })
              }
            />
          )}
        </section>

        <section className="glass-card flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
              <Calculator className="h-4 w-4" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                {t.hub.tabGrades}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 ">{t.hub.gradesHint}</p>
          </div>
          {loadingFlags ? (
            <span className="text-xs text-slate-600 dark:text-slate-400 ">{t.loading}</span>
          ) : (
            <Switch
              checked={gradeCalcEnabled}
              disabled={pending}
              label={gradeCalcEnabled ? t.active : t.inactive}
              onChange={(v) =>
                startTransition(async () => {
                  const r = await updateTeacherFeatureFlags({
                    grade_calculator_enabled: v,
                  });
                  if (r.success) {
                    setGradeCalcEnabled(v);
                    success(r.message ?? "");
                  } else error(r.error);
                })
              }
            />
          )}
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t.hub.tabResources}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 ">{t.hub.resourcesHint}</p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" />
            مورد جديد
          </Button>
        </div>

        <div className="glass-card grid gap-4 p-4 sm:grid-cols-3">
          <Select
            label="الصف"
            name="grade_filter"
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value);
              setUnitFilter("");
            }}
          >
            <option value="">كل الصفوف</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title_ar}
              </option>
            ))}
          </Select>
          <Select
            label="الوحدة"
            name="unit_filter"
            value={unitFilter}
            disabled={!gradeFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
          >
            <option value="">كل الوحدات</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title_ar}
              </option>
            ))}
          </Select>
          <Select
            label="التصنيف"
            name="category_filter"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as "" | TeacherSpaceCategory)
            }
          >
            <option value="">كل التصنيفات</option>
            {TEACHER_SPACE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        {loadingItems ? (
          <PageLoader />
        ) : items.length === 0 ? (
          <EmptyState title={t.hub.noItems} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {item.title_ar}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 ">
                      {TEACHER_SPACE_CATEGORIES.find(
                        (c) => c.value === item.category
                      )?.label ?? item.category}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.grades?.title_ar && (
                        <span className="badge badge-info">
                          {item.grades.title_ar}
                        </span>
                      )}
                      {item.units?.title_ar && (
                        <span className="badge badge-muted">
                          {item.units.title_ar}
                        </span>
                      )}
                      {item.is_coming_soon && (
                        <span className="badge badge-warning">{t.comingSoon}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t.hub.open}
                  </a>
                  <div className="flex flex-wrap gap-3">
                    <Switch
                      checked={item.is_active !== false}
                      disabled={pending}
                      label={t.hub.toggleActive}
                      onChange={(v) =>
                        startTransition(async () => {
                          const r = await toggleTeacherSpaceActive(item.id, v);
                          if (r.success) {
                            success(r.message ?? "");
                            await loadItems();
                          } else error(r.error);
                        })
                      }
                    />
                    <Switch
                      checked={item.is_coming_soon}
                      disabled={pending}
                      label={t.hub.toggleSoon}
                      onChange={(v) =>
                        startTransition(async () => {
                          const r = await toggleTeacherSpaceComingSoon(
                            item.id,
                            v
                          );
                          if (r.success) {
                            success(r.message ?? "");
                            await loadItems();
                          } else error(r.error);
                        })
                      }
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل المورد" : "إضافة مورد للمعلم"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
          <Select
            label="التصنيف"
            name="category"
            required
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                category: e.target.value as TeacherSpaceCategory,
              }))
            }
          >
            {TEACHER_SPACE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            label="الصف"
            name="grade_id"
            required
            value={form.grade_id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                grade_id: e.target.value,
                unit_id: "",
              }))
            }
          >
            <option value="">اختر الصف أولاً</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title_ar}
              </option>
            ))}
          </Select>
          <Select
            label="الوحدة"
            name="unit_id"
            required
            disabled={!form.grade_id}
            value={form.unit_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, unit_id: e.target.value }))
            }
          >
            <option value="">
              {form.grade_id ? "اختر الوحدة" : "اختر الصف أولاً"}
            </option>
            {formUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title_ar}
              </option>
            ))}
          </Select>
          <Input
            label="العنوان"
            name="title_ar"
            required
            value={form.title_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, title_ar: e.target.value }))
            }
          />
          <Textarea
            label="وصف"
            name="description_ar"
            value={form.description_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, description_ar: e.target.value }))
            }
          />
          <FileUpload
            label="رفع ملف"
            folder="teacher-space"
            accept="application/pdf,.pdf,image/*"
            value={form.url}
            preview="file"
            onUploaded={(url) => setForm((f) => ({ ...f, url }))}
            onClear={() => setForm((f) => ({ ...f, url: "" }))}
          />
          <Input
            label="أو رابط مباشر"
            name="url"
            dir="ltr"
            required
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_active: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-200 dark:border-slate-800 text-teal-700"
              />
              مفعّل
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={form.is_coming_soon}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_coming_soon: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-200 dark:border-slate-800 text-teal-700"
              />
              قريباً
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" loading={pending}>
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المورد"
        message="هل أنت متأكد من حذف هذا المورد؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteId) return;
            const r = await deleteTeacherSpaceItem(deleteId);
            if (r.success) {
              success(r.message ?? "");
              setDeleteId(null);
              await loadItems();
            } else error(r.error);
          })
        }
        loading={pending}
      />
    </div>
  );
}
