"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ExternalLink,
  FileText,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  Grade,
  Lesson,
  ResourceCategory,
  ResourceWithGrade,
  UnitWithLessons,
} from "@/lib/types";
import {
  CARD_COLOR_PRESETS,
  RESOURCE_CATEGORY_OPTIONS,
  STAGE_LABELS,
} from "@/lib/constants";
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
import {
  createMedia,
  deleteMedia,
  getMediaByUnit,
  updateMedia,
} from "@/app/(dashboard)/media/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

export function CurriculumManager() {
  const { success, error } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [units, setUnits] = useState<UnitWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const [unitModal, setUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitWithLessons | null>(null);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitComingSoon, setUnitComingSoon] = useState(false);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [notes, setNotes] = useState<ResourceWithGrade[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonComingSoon, setLessonComingSoon] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [noteForm, setNoteForm] = useState({
    title_ar: "",
    url: "",
    resource_category: "classbook" as ResourceCategory,
    is_coming_soon: false,
  });
  const [editingNote, setEditingNote] = useState<ResourceWithGrade | null>(
    null
  );

  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

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

  async function loadUnitDetails(unit: UnitWithLessons) {
    setLessons(unit.lessons ?? []);
    const notesRes = await getMediaByUnit(unit.id, "pdf");
    if (notesRes.success) setNotes(notesRes.data ?? []);
    else {
      setNotes([]);
      error(notesRes.error);
    }
  }

  function openCreateUnit() {
    setEditingUnit(null);
    setUnitTitle("");
    setUnitComingSoon(false);
    setLessons([]);
    setNotes([]);
    setEditingLesson(null);
    setEditingNote(null);
    setLessonTitle("");
    setLessonComingSoon(false);
    setNoteForm({
      title_ar: "",
      url: "",
      resource_category: "classbook",
      is_coming_soon: false,
    });
    setUnitModal(true);
  }

  async function openEditUnit(unit: UnitWithLessons) {
    setEditingUnit(unit);
    setUnitTitle(unit.title_ar);
    setUnitComingSoon(unit.is_coming_soon);
    setEditingLesson(null);
    setEditingNote(null);
    setLessonTitle("");
    setNoteForm({
      title_ar: "",
      url: "",
      resource_category: "classbook",
      is_coming_soon: false,
    });
    setUnitModal(true);
    await loadUnitDetails(unit);
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
      if (!result.success) {
        error(result.error);
        return;
      }
      success(result.message ?? "تم الحفظ");
      if (!editingUnit && result.data) {
        const created = result.data as UnitWithLessons;
        setEditingUnit({ ...created, lessons: [] });
        setLessons([]);
        setNotes([]);
      }
      await loadUnits();
      if (editingUnit) {
        const refreshed = await getUnitsByGrade(gradeId);
        if (refreshed.success) {
          const found = (refreshed.data ?? []).find(
            (u) => u.id === editingUnit.id
          );
          if (found) {
            setEditingUnit(found);
            await loadUnitDetails(found);
          }
        }
      }
    });
  }

  function handleLessonSave() {
    if (!editingUnit) {
      error("احفظ الوحدة أولاً ثم أضف الدروس");
      return;
    }
    if (!lessonTitle.trim()) {
      error("عنوان الدرس مطلوب");
      return;
    }
    startTransition(async () => {
      const result = editingLesson
        ? await updateLesson(editingLesson.id, {
            title_ar: lessonTitle,
            is_coming_soon: lessonComingSoon,
          })
        : await createLesson({
            unit_id: editingUnit.id,
            title_ar: lessonTitle,
            is_coming_soon: lessonComingSoon,
          });
      if (result.success) {
        success(result.message ?? "تم حفظ الدرس");
        setLessonTitle("");
        setLessonComingSoon(false);
        setEditingLesson(null);
        const refreshed = await getUnitsByGrade(gradeId);
        if (refreshed.success) {
          const found = (refreshed.data ?? []).find(
            (u) => u.id === editingUnit.id
          );
          if (found) {
            setEditingUnit(found);
            setLessons(found.lessons ?? []);
          }
        }
        await loadUnits();
      } else error(result.error);
    });
  }

  function handleNoteSave() {
    if (!editingUnit) {
      error("احفظ الوحدة أولاً ثم ارفع المذكرات");
      return;
    }
    if (!noteForm.title_ar.trim() || !noteForm.url.trim()) {
      error("العنوان والملف مطلوبان");
      return;
    }
    startTransition(async () => {
      const payload = {
        grade_id: gradeId,
        unit_id: editingUnit.id,
        lesson_id: "",
        type: "pdf" as const,
        title_ar: noteForm.title_ar,
        subject_ar: noteForm.title_ar,
        url: noteForm.url,
        description_ar: "",
        badge_color: CARD_COLOR_PRESETS[0],
        icon_type: "file-text",
        cover_image_url: "",
        resource_category: noteForm.resource_category,
        is_coming_soon: noteForm.is_coming_soon,
      };
      const result = editingNote
        ? await updateMedia(editingNote.id, payload)
        : await createMedia(payload);
      if (result.success) {
        success(result.message ?? "تم حفظ المذكرة");
        setEditingNote(null);
        setNoteForm({
          title_ar: "",
          url: "",
          resource_category: "classbook",
          is_coming_soon: false,
        });
        const notesRes = await getMediaByUnit(editingUnit.id, "pdf");
        if (notesRes.success) setNotes(notesRes.data ?? []);
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
            <Layers className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">الوحدات والمواد</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            الوحدات والدروس والمذكرات
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 ">
            إدارة الوحدة ودروسها وملفاتها من نافذة واحدةحدة
          </p>
        </div>
        <Button onClick={openCreateUnit} disabled={!gradeId} className="shrink-0">
          <Plus className="h-4 w-4" />
          وحدة جديدة
        </Button>
      </header>

      <div className="glass-card p-4">
        <Select
          label="الصف الدراسي"
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

      {loading ? (
        <PageLoader />
      ) : units.length === 0 ? (
        <EmptyState
          title="لا توجد وحدات"
          description="أضف وحدة ثم أدر دروسها ومذكراتها من نفس النافذة"
        />
      ) : (
        <div className="space-y-3">
          {units.map((unit) => (
            <article key={unit.id} className="glass-card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {unit.title_ar}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 ">
                    {(unit.lessons ?? []).length} درس
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {unit.is_coming_soon && (
                      <span className="badge badge-warning">قريباً</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={unit.is_coming_soon}
                    disabled={pending}
                    label="قريباً"
                    onChange={(v) =>
                      startTransition(async () => {
                        const r = await toggleUnitComingSoon(unit.id, v);
                        if (r.success) {
                          success(r.message ?? "");
                          await loadUnits();
                        } else error(r.error);
                      })
                    }
                  />
                  <Button size="sm" variant="ghost" onClick={() => openEditUnit(unit)}>
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
              {(unit.lessons ?? []).length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                  <ul className="space-y-1.5">
                    {(unit.lessons ?? []).map((lesson) => (
                      <li
                        key={lesson.id}
                        className="flex items-center justify-between gap-2 text-sm text-slate-900 dark:text-slate-100"
                      >
                        <span className="truncate">{lesson.title_ar}</span>
                        {lesson.is_coming_soon && (
                          <span className="badge badge-warning">قريباً</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={unitModal}
        onClose={() => setUnitModal(false)}
        title={editingUnit ? "إدارة الوحدة" : "وحدة جديدة"}
        size="xl"
      >
        <div className="space-y-6 overflow-x-hidden">
          <form onSubmit={handleUnitSubmit} className="space-y-4">
            <Input
              label="عنوان الوحدة"
              name="unit_title"
              required
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={unitComingSoon}
                onChange={(e) => setUnitComingSoon(e.target.checked)}
                className="h-4 w-4 rounded border-slate-200 dark:border-slate-800 text-teal-700"
              />
              تعليم الوحدة كـ «قريباً»
            </label>
            <div className="flex justify-end gap-2">
              <Button type="submit" loading={pending}>
                {editingUnit ? "حفظ الوحدة" : "إنشاء الوحدة"}
              </Button>
            </div>
          </form>

          {editingUnit && (
            <>
              <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">الدروس</h3>
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {lesson.title_ar}
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={lesson.is_coming_soon}
                          disabled={pending}
                          label="قريباً"
                          onChange={(v) =>
                            startTransition(async () => {
                              const r = await toggleLessonComingSoon(
                                lesson.id,
                                v
                              );
                              if (r.success) {
                                success(r.message ?? "");
                                const refreshed = await getUnitsByGrade(gradeId);
                                if (refreshed.success) {
                                  const found = (refreshed.data ?? []).find(
                                    (u: UnitWithLessons) =>
                                      u.id === editingUnit.id
                                  );
                                  if (found) setLessons(found.lessons ?? []);
                                }
                                await loadUnits();
                              } else error(r.error);
                            })
                          }
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingLesson(lesson);
                            setLessonTitle(lesson.title_ar);
                            setLessonComingSoon(lesson.is_coming_soon);
                          }}
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
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    label={editingLesson ? "تعديل الدرس" : "درس جديد"}
                    name="lesson_title"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                  />
                  <div className="flex items-end gap-2">
                    <Button type="button" onClick={handleLessonSave} loading={pending}>
                      <Plus className="h-4 w-4" />
                      {editingLesson ? "تحديث" : "إضافة"}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                  <FileText className="h-4 w-4" />
                  المذكرات والملخصات
                </h3>
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {note.title_ar}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 ">
                          {RESOURCE_CATEGORY_OPTIONS.find(
                            (c) => c.value === note.resource_category
                          )?.label ?? ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 text-teal-700 hover:bg-white dark:bg-slate-900 dark:text-teal-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingNote(note);
                            setNoteForm({
                              title_ar: note.title_ar,
                              url: note.url,
                              resource_category:
                                (note.resource_category as ResourceCategory) ||
                                "classbook",
                              is_coming_soon: note.is_coming_soon,
                            });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteNoteId(note.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Input
                  label="عنوان المذكرة"
                  name="note_title"
                  value={noteForm.title_ar}
                  onChange={(e) =>
                    setNoteForm((f) => ({ ...f, title_ar: e.target.value }))
                  }
                />
                <Select
                  label="التصنيف"
                  name="resource_category"
                  value={noteForm.resource_category}
                  onChange={(e) =>
                    setNoteForm((f) => ({
                      ...f,
                      resource_category: e.target.value as ResourceCategory,
                    }))
                  }
                >
                  {RESOURCE_CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <FileUpload
                  label="رفع ملف PDF"
                  folder="notes"
                  accept="application/pdf,.pdf"
                  value={noteForm.url}
                  preview="file"
                  onUploaded={(url) => setNoteForm((f) => ({ ...f, url }))}
                  onClear={() => setNoteForm((f) => ({ ...f, url: "" }))}
                />
                <label className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={noteForm.is_coming_soon}
                    onChange={(e) =>
                      setNoteForm((f) => ({
                        ...f,
                        is_coming_soon: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-200 dark:border-slate-800 text-teal-700"
                  />
                  تعليم كـ «قريباً»
                </label>
                <Button type="button" onClick={handleNoteSave} loading={pending}>
                  <Plus className="h-4 w-4" />
                  {editingNote ? "تحديث المذكرة" : "إضافة المذكرة"}
                </Button>
              </section>
            </>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setUnitModal(false)}
            >
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteUnitId}
        title="حذف الوحدة"
        message="سيتم حذف الوحدة ودروسها المرتبطة. هل أنت متأكد؟"
        onCancel={() => setDeleteUnitId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteUnitId) return;
            const r = await deleteUnit(deleteUnitId);
            if (r.success) {
              success(r.message ?? "");
              setDeleteUnitId(null);
              setUnitModal(false);
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
            if (!deleteLessonId || !editingUnit) return;
            const r = await deleteLesson(deleteLessonId);
            if (r.success) {
              success(r.message ?? "");
              setDeleteLessonId(null);
              const refreshed = await getUnitsByGrade(gradeId);
              if (refreshed.success) {
                const found = (refreshed.data ?? []).find(
                  (u: UnitWithLessons) => u.id === editingUnit.id
                );
                if (found) setLessons(found.lessons ?? []);
              }
              await loadUnits();
            } else error(r.error);
          })
        }
        loading={pending}
      />

      <ConfirmDialog
        open={!!deleteNoteId}
        title="حذف المذكرة"
        message="هل أنت متأكد من حذف هذه المذكرة؟"
        onCancel={() => setDeleteNoteId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteNoteId || !editingUnit) return;
            const r = await deleteMedia(deleteNoteId);
            if (r.success) {
              success(r.message ?? "");
              setDeleteNoteId(null);
              const notesRes = await getMediaByUnit(editingUnit.id, "pdf");
              if (notesRes.success) setNotes(notesRes.data ?? []);
            } else error(r.error);
          })
        }
        loading={pending}
      />
    </div>
  );
}
