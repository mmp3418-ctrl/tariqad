"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import type { Grade, Lesson, UnitWithLessons } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/constants";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import {
  createLesson,
  createUnit,
  deleteLesson,
  deleteUnit,
  getUnitsByGrade,
  toggleLessonComingSoon,
  toggleUnitComingSoon,
  updateLesson,
  updateUnit,
} from "@/app/(dashboard)/units/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

export function UnitsManager() {
  const { success, error } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [units, setUnits] = useState<UnitWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [unitModal, setUnitModal] = useState(false);
  const [lessonModal, setLessonModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitWithLessons | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonUnitId, setLessonUnitId] = useState("");
  const [unitTitle, setUnitTitle] = useState("");
  const [unitComingSoon, setUnitComingSoon] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonComingSoon, setLessonComingSoon] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);

  const loadGrades = useCallback(async () => {
    const result = await getGrades();
    if (result.success) {
      const list = result.data ?? [];
      setGrades(list);
      if (!gradeId && list[0]) setGradeId(list[0].id);
    }
  }, [gradeId]);

  const loadUnits = useCallback(async () => {
    if (!gradeId) {
      setUnits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getUnitsByGrade(gradeId);
    if (result.success) setUnits(result.data ?? []);
    else error(result.error);
    setLoading(false);
  }, [gradeId, error]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  function openCreateUnit() {
    setEditingUnit(null);
    setUnitTitle("");
    setUnitComingSoon(false);
    setUnitModal(true);
  }

  function openEditUnit(unit: UnitWithLessons) {
    setEditingUnit(unit);
    setUnitTitle(unit.title_ar);
    setUnitComingSoon(unit.is_coming_soon);
    setUnitModal(true);
  }

  function openCreateLesson(unitId: string) {
    setEditingLesson(null);
    setLessonUnitId(unitId);
    setLessonTitle("");
    setLessonComingSoon(false);
    setLessonModal(true);
  }

  function openEditLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    setLessonUnitId(lesson.unit_id);
    setLessonTitle(lesson.title_ar);
    setLessonComingSoon(lesson.is_coming_soon);
    setLessonModal(true);
  }

  function handleUnitSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editingUnit
        ? await updateUnit(editingUnit.id, {
            title_ar: unitTitle,
            is_coming_soon: unitComingSoon,
          })
        : await createUnit({
            grade_id: gradeId,
            title_ar: unitTitle,
            is_coming_soon: unitComingSoon,
          });
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setUnitModal(false);
        await loadUnits();
      } else error(result.error);
    });
  }

  function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editingLesson
        ? await updateLesson(editingLesson.id, {
            title_ar: lessonTitle,
            is_coming_soon: lessonComingSoon,
          })
        : await createLesson({
            unit_id: lessonUnitId,
            title_ar: lessonTitle,
            is_coming_soon: lessonComingSoon,
          });
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setLessonModal(false);
        await loadUnits();
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <Layers className="h-5 w-5" />
            <span className="text-sm font-semibold">الوحدات والدروس</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            إدارة الوحدات والدروس
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            اختر صفاً، أضف وحداته، ثم أضف دروس كل وحدة مع خيار «قريباً»
          </p>
        </div>
        <Button onClick={openCreateUnit} disabled={!gradeId}>
          <Plus className="h-4 w-4" />
          وحدة جديدة
        </Button>
      </header>

      <div className="glass-card p-4">
        <Select
          label="اختر الصف الدراسي"
          name="grade_id"
          value={gradeId}
          onChange={(e) => setGradeId(e.target.value)}
        >
          <option value="" disabled>
            اختر الصف
          </option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title_ar} — {STAGE_LABELS[g.stage]}
            </option>
          ))}
        </Select>
      </div>

      {!gradeId ? (
        <EmptyState title="اختر صفاً للبدء" />
      ) : loading ? (
        <PageLoader />
      ) : units.length === 0 ? (
        <EmptyState
          title="لا توجد وحدات لهذا الصف"
          description="أضف الوحدة الأولى ثم أضف دروسها"
        />
      ) : (
        <div className="space-y-4">
          {units.map((unit) => (
            <article key={unit.id} className="glass-card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {unit.title_ar}
                  </h3>
                  {unit.is_coming_soon && (
                    <span className="badge badge-warning mt-1">قريباً</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={unit.is_coming_soon}
                    onChange={(v) =>
                      startTransition(async () => {
                        const r = await toggleUnitComingSoon(unit.id, v);
                        if (r.success) {
                          success(r.message ?? "تم");
                          await loadUnits();
                        } else error(r.error);
                      })
                    }
                    disabled={pending}
                    label="قريباً"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openCreateLesson(unit.id)}
                  >
                    <Plus className="h-4 w-4" />
                    درس
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditUnit(unit)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteUnitId(unit.id)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 p-4">
                {(unit.lessons ?? []).length === 0 ? (
                  <p className="text-sm text-slate-400">لا توجد دروس بعد</p>
                ) : (
                  (unit.lessons ?? []).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">
                          {lesson.title_ar}
                        </p>
                        {lesson.is_coming_soon && (
                          <span className="badge badge-warning mt-1">قريباً</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={lesson.is_coming_soon}
                          onChange={(v) =>
                            startTransition(async () => {
                              const r = await toggleLessonComingSoon(
                                lesson.id,
                                v
                              );
                              if (r.success) {
                                success(r.message ?? "تم");
                                await loadUnits();
                              } else error(r.error);
                            })
                          }
                          disabled={pending}
                          label="قريباً"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditLesson(lesson)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteLessonId(lesson.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={unitModal}
        onClose={() => setUnitModal(false)}
        title={editingUnit ? "تعديل الوحدة" : "إضافة وحدة"}
      >
        <form onSubmit={handleUnitSubmit} className="space-y-4">
          <Input
            label="عنوان الوحدة"
            name="title_ar"
            required
            placeholder="الوحدة الأولى"
            value={unitTitle}
            onChange={(e) => setUnitTitle(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unitComingSoon}
              onChange={(e) => setUnitComingSoon(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700"
            />
            تعليم كـ «قريباً»
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setUnitModal(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={pending}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={lessonModal}
        onClose={() => setLessonModal(false)}
        title={editingLesson ? "تعديل الدرس" : "إضافة درس"}
      >
        <form onSubmit={handleLessonSubmit} className="space-y-4">
          <Input
            label="عنوان الدرس"
            name="title_ar"
            required
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lessonComingSoon}
              onChange={(e) => setLessonComingSoon(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700"
            />
            تعليم كـ «قريباً»
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLessonModal(false)}
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
        open={!!deleteUnitId}
        title="حذف الوحدة"
        message="سيتم حذف الوحدة وجميع دروسها. هل أنت متأكد؟"
        onCancel={() => setDeleteUnitId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteUnitId) return;
            const r = await deleteUnit(deleteUnitId);
            if (r.success) {
              success(r.message ?? "تم الحذف");
              setDeleteUnitId(null);
              await loadUnits();
            } else error(r.error);
          })
        }
        loading={pending}
      />

      <ConfirmDialog
        open={!!deleteLessonId}
        title="حذف الدرس"
        message="هل أنت متأكد من حذف هذا الدرس؟"
        onCancel={() => setDeleteLessonId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteLessonId) return;
            const r = await deleteLesson(deleteLessonId);
            if (r.success) {
              success(r.message ?? "تم الحذف");
              setDeleteLessonId(null);
              await loadUnits();
            } else error(r.error);
          })
        }
        loading={pending}
      />
    </div>
  );
}
