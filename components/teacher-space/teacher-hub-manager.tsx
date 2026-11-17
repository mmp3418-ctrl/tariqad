"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
  ClassSchedule,
  Grade,
  GradeCalculatorTool,
  GradeRecord,
  TeacherSpaceItem,
  Unit,
} from "@/lib/types";
import { DAY_LABELS, PERIODS, WEEKDAYS } from "@/lib/constants";
import { useLocale } from "@/lib/i18n";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import { getUnitsByGrade } from "@/app/(dashboard)/units/actions";
import {
  createClassSchedule,
  deleteClassSchedule,
  getClassNames,
  getClassSchedules,
  toggleClassScheduleActive,
  updateClassSchedule,
} from "@/app/(dashboard)/schedules/actions";
import {
  ensureTeacherResourcePresets,
  toggleTeacherSpaceActive,
  toggleTeacherSpaceComingSoon,
  updateTeacherSpaceItem,
} from "@/app/(dashboard)/teacher-space/actions";
import {
  createGradeRecord,
  deleteGradeRecord,
  ensureGradeCalculatorPresets,
  getGradeRecords,
  toggleGradeCalculatorActive,
  toggleGradeCalculatorComingSoon,
  updateGradeCalculatorTool,
  updateGradeRecord,
} from "@/app/(dashboard)/grade-calculator/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

type Tab = "schedules" | "resources" | "grades";

export function TeacherHubManager() {
  const { t, locale } = useLocale();
  const { success, error } = useToast();
  const [tab, setTab] = useState<Tab>("schedules");
  const [pending, startTransition] = useTransition();

  /* schedules */
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(
    null
  );
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    class_name: "",
    day_of_week: 0,
    period_number: 1,
    subject: "",
    room: "",
  });

  /* resources */
  const [resources, setResources] = useState<TeacherSpaceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourceModal, setResourceModal] = useState(false);
  const [editingResource, setEditingResource] =
    useState<TeacherSpaceItem | null>(null);
  const [resourceForm, setResourceForm] = useState({
    title_ar: "",
    title_en: "",
    description_ar: "",
    url: "",
  });

  /* grade tools + records */
  const [gradeTools, setGradeTools] = useState<GradeCalculatorTool[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [gradesLoading, setGradesLoading] = useState(true);
  const [toolModal, setToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState<GradeCalculatorTool | null>(
    null
  );
  const [toolForm, setToolForm] = useState({
    title_ar: "",
    description_ar: "",
    url: "",
    max_score: 100,
  });
  const [recordModal, setRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GradeRecord | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({
    student_name: "",
    grade_id: "",
    unit_id: "",
    score: 0,
    max_score: 100,
    notes: "",
  });
  const [formUnits, setFormUnits] = useState<Unit[]>([]);

  const loadSchedules = useCallback(async () => {
    setSchedulesLoading(true);
    const [list, names] = await Promise.all([
      getClassSchedules(classFilter || undefined),
      getClassNames(),
    ]);
    if (list.success) setSchedules(list.data ?? []);
    else error(list.error);
    if (names.success) setClasses(names.data ?? []);
    setSchedulesLoading(false);
  }, [classFilter, error]);

  const loadResources = useCallback(async () => {
    setResourcesLoading(true);
    const result = await ensureTeacherResourcePresets();
    if (result.success) setResources(result.data ?? []);
    else error(result.error);
    setResourcesLoading(false);
  }, [error]);

  const loadGradeSection = useCallback(async () => {
    setGradesLoading(true);
    const [tools, records, gradeList] = await Promise.all([
      ensureGradeCalculatorPresets(),
      getGradeRecords({
        grade_id: gradeFilter || undefined,
        unit_id: unitFilter || undefined,
      }),
      getGrades(),
    ]);
    if (tools.success) setGradeTools(tools.data ?? []);
    else error(tools.error);
    if (records.success) setGradeRecords(records.data ?? []);
    else error(records.error);
    if (gradeList.success) setGrades(gradeList.data ?? []);
    setGradesLoading(false);
  }, [gradeFilter, unitFilter, error]);

  useEffect(() => {
    if (tab === "schedules") void loadSchedules();
  }, [tab, loadSchedules]);

  useEffect(() => {
    if (tab === "resources") void loadResources();
  }, [tab, loadResources]);

  useEffect(() => {
    if (tab === "grades") void loadGradeSection();
  }, [tab, loadGradeSection]);

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
    if (!recordForm.grade_id) {
      setFormUnits([]);
      return;
    }
    void getUnitsByGrade(recordForm.grade_id).then((r) => {
      if (r.success) setFormUnits(r.data ?? []);
    });
  }, [recordForm.grade_id]);

  const gridMap = useMemo(() => {
    const map = new Map<string, ClassSchedule>();
    for (const item of schedules) {
      map.set(`${item.day_of_week}-${item.period_number}`, item);
    }
    return map;
  }, [schedules]);

  function openScheduleCreate(day?: number, period?: number) {
    setEditingSchedule(null);
    setScheduleForm({
      class_name: classFilter || "",
      day_of_week: day ?? 0,
      period_number: period ?? 1,
      subject: "",
      room: "",
    });
    setScheduleModal(true);
  }

  function openScheduleEdit(item: ClassSchedule) {
    setEditingSchedule(item);
    setScheduleForm({
      class_name: item.class_name,
      day_of_week: item.day_of_week,
      period_number: item.period_number,
      subject: item.subject,
      room: item.room ?? "",
    });
    setScheduleModal(true);
  }

  function submitSchedule(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editingSchedule
        ? await updateClassSchedule(editingSchedule.id, scheduleForm)
        : await createClassSchedule(scheduleForm);
      if (result.success) {
        success(result.message ?? t.save);
        setScheduleModal(false);
        await loadSchedules();
      } else error(result.error);
    });
  }

  function openResourceEdit(item: TeacherSpaceItem) {
    setEditingResource(item);
    setResourceForm({
      title_ar: item.title_ar,
      title_en: item.title_en ?? "",
      description_ar: item.description_ar ?? "",
      url: item.url,
    });
    setResourceModal(true);
  }

  function submitResource(e: React.FormEvent) {
    e.preventDefault();
    if (!editingResource) return;
    startTransition(async () => {
      const result = await updateTeacherSpaceItem(
        editingResource.id,
        resourceForm
      );
      if (result.success) {
        success(result.message ?? t.save);
        setResourceModal(false);
        await loadResources();
      } else error(result.error);
    });
  }

  function openToolEdit(item: GradeCalculatorTool) {
    setEditingTool(item);
    setToolForm({
      title_ar: item.title_ar,
      description_ar: item.description_ar ?? "",
      url: item.url,
      max_score: item.max_score,
    });
    setToolModal(true);
  }

  function submitTool(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTool) return;
    startTransition(async () => {
      const result = await updateGradeCalculatorTool(editingTool.id, toolForm);
      if (result.success) {
        success(result.message ?? t.save);
        setToolModal(false);
        await loadGradeSection();
      } else error(result.error);
    });
  }

  function openRecordCreate() {
    setEditingRecord(null);
    setRecordForm({
      student_name: "",
      grade_id: gradeFilter || "",
      unit_id: unitFilter || "",
      score: 0,
      max_score: 100,
      notes: "",
    });
    setRecordModal(true);
  }

  function openRecordEdit(item: GradeRecord) {
    setEditingRecord(item);
    setRecordForm({
      student_name: item.student_name,
      grade_id: item.grade_id,
      unit_id: item.unit_id,
      score: item.score,
      max_score: item.max_score,
      notes: item.notes ?? "",
    });
    setRecordModal(true);
  }

  function submitRecord(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editingRecord
        ? await updateGradeRecord(editingRecord.id, recordForm)
        : await createGradeRecord(recordForm);
      if (result.success) {
        success(result.message ?? t.save);
        setRecordModal(false);
        await loadGradeSection();
      } else error(result.error);
    });
  }

  const tabs: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
    { id: "schedules", label: t.hub.tabSchedules, icon: CalendarDays },
    { id: "resources", label: t.hub.tabResources, icon: Briefcase },
    { id: "grades", label: t.hub.tabGrades, icon: Calculator },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="min-w-0">
        <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
          <Briefcase className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{t.hub.title}</span>
        </div>
        <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
          {t.hub.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t.hub.subtitle}</p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition sm:px-4 ${
                active
                  ? "bg-teal-700 text-white shadow-sm dark:bg-teal-600"
                  : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "schedules" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="glass-card w-full p-4 sm:max-w-sm">
              <Select
                label={locale === "ar" ? "تصفية حسب الفصل" : "Filter by class"}
                name="class_filter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">
                  {locale === "ar" ? "كل الفصول" : "All classes"}
                </option>
                {classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={() => openScheduleCreate()} className="shrink-0">
              <Plus className="h-4 w-4" />
              {locale === "ar" ? "حصة جديدة" : "New period"}
            </Button>
          </div>

          {schedulesLoading ? (
            <PageLoader />
          ) : schedules.length === 0 ? (
            <EmptyState title={t.hub.noItems} />
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] sm:block">
                <table className="w-full min-w-[720px] border-collapse text-center text-sm">
                  <thead>
                    <tr className="bg-[var(--surface-muted)]">
                      <th className="border-b border-[var(--border)] px-3 py-3 text-xs font-bold text-[var(--muted)]">
                        #
                      </th>
                      {WEEKDAYS.map((day) => (
                        <th
                          key={day}
                          className="border-b border-[var(--border)] px-3 py-3 text-xs font-bold text-[var(--foreground)]"
                        >
                          {DAY_LABELS[day]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period) => (
                      <tr key={period}>
                        <td className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 font-bold text-[var(--muted)]">
                          {period}
                        </td>
                        {WEEKDAYS.map((day) => {
                          const cell = classFilter
                            ? gridMap.get(`${day}-${period}`)
                            : schedules.find(
                                (i) =>
                                  i.day_of_week === day &&
                                  i.period_number === period
                              );
                          return (
                            <td
                              key={`${day}-${period}`}
                              className="border-b border-[var(--border)] p-1.5"
                            >
                              {cell ? (
                                <div
                                  className={`rounded-xl p-2 text-start ${
                                    cell.is_active
                                      ? "bg-teal-50 dark:bg-teal-950/40"
                                      : "bg-slate-100 opacity-60 dark:bg-slate-800"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => openScheduleEdit(cell)}
                                    className="w-full text-start"
                                  >
                                    <p className="text-xs font-bold text-teal-900 dark:text-teal-100">
                                      {cell.subject}
                                    </p>
                                    <p className="text-[11px] text-teal-700/80 dark:text-teal-200/80">
                                      {cell.class_name}
                                    </p>
                                  </button>
                                  <div className="mt-2">
                                    <Switch
                                      checked={cell.is_active !== false}
                                      disabled={pending}
                                      label={t.hub.toggleActive}
                                      onChange={(v) =>
                                        startTransition(async () => {
                                          const r =
                                            await toggleClassScheduleActive(
                                              cell.id,
                                              v
                                            );
                                          if (r.success) {
                                            success(r.message ?? "");
                                            await loadSchedules();
                                          } else error(r.error);
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openScheduleCreate(day, period)}
                                  className="flex h-14 w-full items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-2 sm:hidden">
                {schedules.map((item) => (
                  <article key={item.id} className="glass-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--foreground)]">
                          {item.subject}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {item.class_name} · {DAY_LABELS[item.day_of_week]} ·{" "}
                          {item.period_number}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openScheduleEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Switch
                        checked={item.is_active !== false}
                        disabled={pending}
                        label={t.hub.toggleActive}
                        onChange={(v) =>
                          startTransition(async () => {
                            const r = await toggleClassScheduleActive(
                              item.id,
                              v
                            );
                            if (r.success) {
                              success(r.message ?? "");
                              await loadSchedules();
                            } else error(r.error);
                          })
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {tab === "resources" && (
        <section className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{t.hub.manageOnly}</p>
          {resourcesLoading ? (
            <PageLoader />
          ) : resources.length === 0 ? (
            <EmptyState title={t.hub.noItems} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {resources.map((item) => (
                <article key={item.id} className="glass-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--foreground)]">
                        {locale === "en" && item.title_en
                          ? item.title_en
                          : item.title_ar}
                      </p>
                      {item.description_ar && (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                          {item.description_ar}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.is_active === false && (
                          <span className="badge badge-muted">{t.inactive}</span>
                        )}
                        {item.is_coming_soon && (
                          <span className="badge badge-warning">
                            {t.comingSoon}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openResourceEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
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
                            const r = await toggleTeacherSpaceActive(
                              item.id,
                              v
                            );
                            if (r.success) {
                              success(r.message ?? "");
                              await loadResources();
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
                              await loadResources();
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
      )}

      {tab === "grades" && (
        <section className="space-y-5">
          <p className="text-sm text-[var(--muted)]">{t.hub.manageOnly}</p>

          {gradesLoading ? (
            <PageLoader />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {gradeTools.map((item) => (
                  <article key={item.id} className="glass-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--foreground)]">
                          {item.title_ar}
                        </p>
                        {item.description_ar && (
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                            {item.description_ar}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openToolEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
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
                              const r = await toggleGradeCalculatorActive(
                                item.id,
                                v
                              );
                              if (r.success) {
                                success(r.message ?? "");
                                await loadGradeSection();
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
                              const r = await toggleGradeCalculatorComingSoon(
                                item.id,
                                v
                              );
                              if (r.success) {
                                success(r.message ?? "");
                                await loadGradeSection();
                              } else error(r.error);
                            })
                          }
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="glass-card grid w-full gap-3 p-4 sm:grid-cols-2">
                  <Select
                    label={locale === "ar" ? "الصف" : "Grade"}
                    name="grade_filter"
                    value={gradeFilter}
                    onChange={(e) => {
                      setGradeFilter(e.target.value);
                      setUnitFilter("");
                    }}
                  >
                    <option value="">
                      {locale === "ar" ? "كل الصفوف" : "All grades"}
                    </option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title_ar}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={locale === "ar" ? "الوحدة" : "Unit"}
                    name="unit_filter"
                    value={unitFilter}
                    disabled={!gradeFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                  >
                    <option value="">
                      {locale === "ar" ? "كل الوحدات" : "All units"}
                    </option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.title_ar}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button onClick={openRecordCreate} className="shrink-0">
                  <Plus className="h-4 w-4" />
                  {locale === "ar" ? "درجة جديدة" : "New grade"}
                </Button>
              </div>

              {gradeRecords.length === 0 ? (
                <EmptyState title={t.hub.noItems} />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  <table className="w-full min-w-[560px] text-start text-sm">
                    <thead className="bg-[var(--surface-muted)] text-xs font-bold text-[var(--muted)]">
                      <tr>
                        <th className="px-3 py-3">
                          {locale === "ar" ? "الطالب" : "Student"}
                        </th>
                        <th className="px-3 py-3">
                          {locale === "ar" ? "الصف" : "Grade"}
                        </th>
                        <th className="px-3 py-3">
                          {locale === "ar" ? "الدرجة" : "Score"}
                        </th>
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {gradeRecords.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="px-3 py-3 font-semibold text-[var(--foreground)]">
                            {item.student_name}
                          </td>
                          <td className="px-3 py-3 text-[var(--muted)]">
                            {item.grades?.title_ar ?? "—"}
                          </td>
                          <td className="px-3 py-3 font-bold text-teal-800 dark:text-teal-300">
                            {item.score} / {item.max_score}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openRecordEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteRecordId(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <Modal
        open={scheduleModal}
        onClose={() => setScheduleModal(false)}
        title={
          editingSchedule
            ? locale === "ar"
              ? "تعديل الحصة"
              : "Edit period"
            : locale === "ar"
              ? "إضافة حصة"
              : "Add period"
        }
      >
        <form onSubmit={submitSchedule} className="space-y-4">
          <Input
            label={locale === "ar" ? "اسم الفصل" : "Class name"}
            name="class_name"
            required
            value={scheduleForm.class_name}
            onChange={(e) =>
              setScheduleForm((f) => ({ ...f, class_name: e.target.value }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={locale === "ar" ? "اليوم" : "Day"}
              name="day_of_week"
              value={scheduleForm.day_of_week}
              onChange={(e) =>
                setScheduleForm((f) => ({
                  ...f,
                  day_of_week: Number(e.target.value),
                }))
              }
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABELS[day]}
                </option>
              ))}
            </Select>
            <Select
              label={locale === "ar" ? "رقم الحصة" : "Period"}
              name="period_number"
              value={scheduleForm.period_number}
              onChange={(e) =>
                setScheduleForm((f) => ({
                  ...f,
                  period_number: Number(e.target.value),
                }))
              }
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label={locale === "ar" ? "المادة" : "Subject"}
            name="subject"
            required
            value={scheduleForm.subject}
            onChange={(e) =>
              setScheduleForm((f) => ({ ...f, subject: e.target.value }))
            }
          />
          <Input
            label={locale === "ar" ? "القاعة" : "Room"}
            name="room"
            value={scheduleForm.room}
            onChange={(e) =>
              setScheduleForm((f) => ({ ...f, room: e.target.value }))
            }
          />
          <div className="flex flex-wrap justify-between gap-2">
            {editingSchedule ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setScheduleModal(false);
                  setDeleteScheduleId(editingSchedule.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setScheduleModal(false)}
              >
                {t.cancel}
              </Button>
              <Button type="submit" loading={pending}>
                {t.save}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={resourceModal}
        onClose={() => setResourceModal(false)}
        title={locale === "ar" ? "تعديل المورد" : "Edit resource"}
      >
        <form onSubmit={submitResource} className="space-y-4">
          <Input
            label={locale === "ar" ? "العنوان" : "Title"}
            name="title_ar"
            required
            value={resourceForm.title_ar}
            onChange={(e) =>
              setResourceForm((f) => ({ ...f, title_ar: e.target.value }))
            }
          />
          <Input
            label={locale === "ar" ? "العنوان بالإنجليزية" : "English title"}
            name="title_en"
            dir="ltr"
            value={resourceForm.title_en}
            onChange={(e) =>
              setResourceForm((f) => ({ ...f, title_en: e.target.value }))
            }
          />
          <Textarea
            label={locale === "ar" ? "الوصف" : "Description"}
            name="description_ar"
            value={resourceForm.description_ar}
            onChange={(e) =>
              setResourceForm((f) => ({
                ...f,
                description_ar: e.target.value,
              }))
            }
          />
          <Input
            label={locale === "ar" ? "الرابط" : "URL"}
            name="url"
            dir="ltr"
            required
            value={resourceForm.url}
            onChange={(e) =>
              setResourceForm((f) => ({ ...f, url: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setResourceModal(false)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" loading={pending}>
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={toolModal}
        onClose={() => setToolModal(false)}
        title={locale === "ar" ? "تعديل الأداة" : "Edit tool"}
      >
        <form onSubmit={submitTool} className="space-y-4">
          <Input
            label={locale === "ar" ? "العنوان" : "Title"}
            name="title_ar"
            required
            value={toolForm.title_ar}
            onChange={(e) =>
              setToolForm((f) => ({ ...f, title_ar: e.target.value }))
            }
          />
          <Textarea
            label={locale === "ar" ? "الوصف" : "Description"}
            name="description_ar"
            value={toolForm.description_ar}
            onChange={(e) =>
              setToolForm((f) => ({ ...f, description_ar: e.target.value }))
            }
          />
          <Input
            label={locale === "ar" ? "الرابط" : "URL"}
            name="url"
            dir="ltr"
            required
            value={toolForm.url}
            onChange={(e) =>
              setToolForm((f) => ({ ...f, url: e.target.value }))
            }
          />
          <Input
            label={locale === "ar" ? "الدرجة القصوى" : "Max score"}
            name="max_score"
            type="number"
            min={1}
            value={toolForm.max_score}
            onChange={(e) =>
              setToolForm((f) => ({
                ...f,
                max_score: Number(e.target.value) || 100,
              }))
            }
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setToolModal(false)}
            >
              {t.cancel}
            </Button>
            <Button type="submit" loading={pending}>
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={recordModal}
        onClose={() => setRecordModal(false)}
        title={
          editingRecord
            ? locale === "ar"
              ? "تعديل الدرجة"
              : "Edit grade"
            : locale === "ar"
              ? "تسجيل درجة"
              : "Add grade"
        }
      >
        <form onSubmit={submitRecord} className="space-y-4">
          <Select
            label={locale === "ar" ? "الصف" : "Grade"}
            name="grade_id"
            required
            value={recordForm.grade_id}
            onChange={(e) =>
              setRecordForm((f) => ({
                ...f,
                grade_id: e.target.value,
                unit_id: "",
              }))
            }
          >
            <option value="">
              {locale === "ar" ? "اختر الصف" : "Select grade"}
            </option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title_ar}
              </option>
            ))}
          </Select>
          <Select
            label={locale === "ar" ? "الوحدة" : "Unit"}
            name="unit_id"
            required
            disabled={!recordForm.grade_id}
            value={recordForm.unit_id}
            onChange={(e) =>
              setRecordForm((f) => ({ ...f, unit_id: e.target.value }))
            }
          >
            <option value="">
              {locale === "ar" ? "اختر الوحدة" : "Select unit"}
            </option>
            {formUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title_ar}
              </option>
            ))}
          </Select>
          <Input
            label={locale === "ar" ? "اسم الطالب" : "Student name"}
            name="student_name"
            required
            value={recordForm.student_name}
            onChange={(e) =>
              setRecordForm((f) => ({ ...f, student_name: e.target.value }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={locale === "ar" ? "الدرجة" : "Score"}
              name="score"
              type="number"
              min={0}
              value={recordForm.score}
              onChange={(e) =>
                setRecordForm((f) => ({
                  ...f,
                  score: Number(e.target.value) || 0,
                }))
              }
            />
            <Input
              label={locale === "ar" ? "من أصل" : "Out of"}
              name="max_score"
              type="number"
              min={1}
              value={recordForm.max_score}
              onChange={(e) =>
                setRecordForm((f) => ({
                  ...f,
                  max_score: Number(e.target.value) || 100,
                }))
              }
            />
          </div>
          <Textarea
            label={locale === "ar" ? "ملاحظات" : "Notes"}
            name="notes"
            value={recordForm.notes}
            onChange={(e) =>
              setRecordForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRecordModal(false)}
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
        open={!!deleteScheduleId}
        title={locale === "ar" ? "حذف الحصة" : "Delete period"}
        message={
          locale === "ar"
            ? "هل أنت متأكد من حذف هذه الحصة؟"
            : "Delete this period?"
        }
        onCancel={() => setDeleteScheduleId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteScheduleId) return;
            const r = await deleteClassSchedule(deleteScheduleId);
            if (r.success) {
              success(r.message ?? "");
              setDeleteScheduleId(null);
              await loadSchedules();
            } else error(r.error);
          })
        }
        loading={pending}
      />

      <ConfirmDialog
        open={!!deleteRecordId}
        title={locale === "ar" ? "حذف السجل" : "Delete record"}
        message={
          locale === "ar" ? "هل أنت متأكد من الحذف؟" : "Delete this record?"
        }
        onCancel={() => setDeleteRecordId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteRecordId) return;
            const r = await deleteGradeRecord(deleteRecordId);
            if (r.success) {
              success(r.message ?? "");
              setDeleteRecordId(null);
              await loadGradeSection();
            } else error(r.error);
          })
        }
        loading={pending}
      />
    </div>
  );
}
