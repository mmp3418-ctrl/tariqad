"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Briefcase, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  Grade,
  TeacherSpaceCategory,
  TeacherSpaceItem,
  Unit,
} from "@/lib/types";
import { TEACHER_SPACE_CATEGORIES } from "@/lib/constants";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import { getUnitsByGrade } from "@/app/(dashboard)/units/actions";
import {
  createTeacherSpaceItem,
  deleteTeacherSpaceItem,
  getTeacherSpaceItems,
  toggleTeacherSpaceComingSoon,
  updateTeacherSpaceItem,
} from "@/app/(dashboard)/teacher-space/actions";
import { SchedulesPanel } from "@/components/schedules/schedules-panel";
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
  is_coming_soon: false,
};

type Tab = "tools" | "schedules";

export function TeacherSpaceManager() {
  const { success, error } = useToast();
  const [tab, setTab] = useState<Tab>("tools");
  const [items, setItems] = useState<TeacherSpaceItem[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [formUnits, setFormUnits] = useState<Unit[]>([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"" | TeacherSpaceCategory>("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherSpaceItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const loadGrades = useCallback(async () => {
    const result = await getGrades();
    if (result.success) setGrades(result.data ?? []);
  }, []);

  const loadFilterUnits = useCallback(async (gradeId: string) => {
    if (!gradeId) {
      setUnits([]);
      return;
    }
    const result = await getUnitsByGrade(gradeId);
    if (result.success) setUnits(result.data ?? []);
    else setUnits([]);
  }, []);

  const loadFormUnits = useCallback(async (gradeId: string) => {
    if (!gradeId) {
      setFormUnits([]);
      return;
    }
    const result = await getUnitsByGrade(gradeId);
    if (result.success) setFormUnits(result.data ?? []);
    else setFormUnits([]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTeacherSpaceItems({
      category: categoryFilter || undefined,
      grade_id: gradeFilter || undefined,
      unit_id: unitFilter || undefined,
    });
    if (result.success) setItems(result.data ?? []);
    else error(result.error);
    setLoading(false);
  }, [categoryFilter, gradeFilter, unitFilter, error]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadFilterUnits(gradeFilter);
  }, [gradeFilter, loadFilterUnits]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFormUnits(form.grade_id);
  }, [form.grade_id, loadFormUnits]);

  const grouped = useMemo(() => {
    const map = new Map<TeacherSpaceCategory, TeacherSpaceItem[]>();
    for (const cat of TEACHER_SPACE_CATEGORIES) map.set(cat.value, []);
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

  function openCreate(category?: TeacherSpaceCategory) {
    setEditing(null);
    setForm({
      ...emptyForm,
      category: category || "lesson_prep",
      grade_id: gradeFilter || "",
      unit_id: unitFilter || "",
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
      is_coming_soon: item.is_coming_soon,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.grade_id) {
      error("يجب اختيار الصف الدراسي أولاً");
      return;
    }
    if (!form.unit_id) {
      error("يجب اختيار الوحدة الدراسية");
      return;
    }
    startTransition(async () => {
      const result = editing
        ? await updateTeacherSpaceItem(editing.id, form)
        : await createTeacherSpaceItem(form);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        await load();
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <Briefcase className="h-5 w-5" />
            <span className="text-sm font-semibold">مساحة المعلم</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            مساحة المعلم والجداول
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            أدوات المعلم حسب الصف والوحدة، مع جداول الحصص في صفحة واحدةحدة
          </p>
        </div>
        {tab === "tools" && (
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            أداة جديدة
          </Button>
        )}
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
        <button
          type="button"
          onClick={() => setTab("tools")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            tab === "tools"
              ? "bg-teal-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          أدوات المعلم
        </button>
        <button
          type="button"
          onClick={() => setTab("schedules")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            tab === "schedules"
              ? "bg-teal-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          جداول المعلمين
        </button>
      </div>

      {tab === "schedules" ? (
        <div className="glass-card p-4 sm:p-5">
          <SchedulesPanel />
        </div>
      ) : (
        <>
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
              label="الوحدة الدراسية"
              name="unit_filter"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              disabled={!gradeFilter}
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

          {loading ? (
            <PageLoader />
          ) : items.length === 0 ? (
            <EmptyState
              title="لا توجد أدوات بعد"
              description="اختر الصف ثم الوحدة عند إضافة تحضير أو أوراق عمل أو غيرها"
            />
          ) : (
            <div className="space-y-6">
              {TEACHER_SPACE_CATEGORIES.filter(
                (c) => !categoryFilter || c.value === categoryFilter
              ).map((cat) => {
                const list = grouped.get(cat.value) ?? [];
                if (categoryFilter && list.length === 0) return null;
                return (
                  <section key={cat.value} className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {cat.label}
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreate(cat.value)}
                      >
                        <Plus className="h-4 w-4" />
                        إضافة
                      </Button>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        لا عناصر في هذا التصنيف
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {list.map((item) => (
                          <article key={item.id} className="glass-card p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900">
                                  {item.title_ar}
                                </p>
                                {item.description_ar && (
                                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                    {item.description_ar}
                                  </p>
                                )}
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
                                    <span className="badge badge-warning">
                                      قريباً
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEdit(item)}
                                >
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
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                فتح
                              </a>
                              <Switch
                                checked={item.is_coming_soon}
                                onChange={(v) =>
                                  startTransition(async () => {
                                    const r =
                                      await toggleTeacherSpaceComingSoon(
                                        item.id,
                                        v
                                      );
                                    if (r.success) {
                                      success(r.message ?? "تم");
                                      await load();
                                    } else error(r.error);
                                  })
                                }
                                disabled={pending}
                                label="قريباً"
                              />
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل أداة" : "إضافة لأدوات المعلم"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
            label="الوحدة الدراسية"
            name="unit_id"
            required
            value={form.unit_id}
            disabled={!form.grade_id}
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
            label="وصف مختصر"
            name="description_ar"
            value={form.description_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, description_ar: e.target.value }))
            }
          />
          <FileUpload
            label="رفع ملف PDF"
            folder="teacher-space"
            accept="application/pdf,.pdf"
            value={form.url}
            preview="file"
            onUploaded={(url) => setForm((f) => ({ ...f, url }))}
            onClear={() => setForm((f) => ({ ...f, url: "" }))}
          />
          <Input
            label="أو الصق رابط"
            name="url"
            dir="ltr"
            required
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_coming_soon}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_coming_soon: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-700"
            />
            تعليم كـ «قريباً»
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={pending}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف العنصر"
        message="هل أنت متأكد من الحذف؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteId) return;
            const r = await deleteTeacherSpaceItem(deleteId);
            if (r.success) {
              success(r.message ?? "تم الحذف");
              setDeleteId(null);
              await load();
            } else error(r.error);
          })
        }
        loading={pending}
      />
    </div>
  );
}
