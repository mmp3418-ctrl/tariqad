"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import type { ClassSchedule } from "@/lib/types";
import { DAY_LABELS, PERIODS, WEEKDAYS } from "@/lib/constants";
import {
  createClassSchedule,
  deleteClassSchedule,
  getClassNames,
  getClassSchedules,
  updateClassSchedule,
} from "@/app/(dashboard)/schedules/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  class_name: "",
  day_of_week: 0,
  period_number: 1,
  subject: "",
  room: "",
};

export function SchoolSchedulesManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<ClassSchedule[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const loadClasses = useCallback(async () => {
    const result = await getClassNames();
    if (result.success) setClasses(result.data ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getClassSchedules(classFilter || undefined);
    if (result.success) setItems(result.data ?? []);
    else error(result.error);
    setLoading(false);
  }, [classFilter, error]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    void load();
  }, [load]);

  const gridMap = useMemo(() => {
    const map = new Map<string, ClassSchedule>();
    for (const item of items) {
      map.set(`${item.day_of_week}-${item.period_number}`, item);
    }
    return map;
  }, [items]);

  function openCreate(day?: number, period?: number) {
    setEditing(null);
    setForm({
      ...emptyForm,
      class_name: classFilter || "",
      day_of_week: day ?? 0,
      period_number: period ?? 1,
    });
    setModalOpen(true);
  }

  function openEdit(item: ClassSchedule) {
    setEditing(item);
    setForm({
      class_name: item.class_name,
      day_of_week: item.day_of_week,
      period_number: item.period_number,
      subject: item.subject,
      room: item.room ?? "",
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateClassSchedule(editing.id, form)
        : await createClassSchedule(form);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        setEditing(null);
        await Promise.all([load(), loadClasses()]);
      } else error(result.error);
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteClassSchedule(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await Promise.all([load(), loadClasses()]);
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <CalendarDays className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">جداول الحصص</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            الجدول العام للفصول
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 ">
            إدارة حصص المدرسة حسب الفصل واليوم — بدون تفعيل/إيقاف
          </p>
        </div>
        <Button onClick={() => openCreate()} className="shrink-0">
          <Plus className="h-4 w-4" />
          حصة جديدة
        </Button>
      </header>

      <div className="glass-card p-4">
        <Select
          label="تصفية حسب الفصل"
          name="class_filter"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">كل الفصول</option>
          {classes.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState title="لا توجد حصص مسجّلة" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sm:block">
            <table className="w-full min-w-[720px] border-collapse text-center text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="border-b border-l border-slate-200 dark:border-slate-800 px-3 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 ">
                    الحصة
                  </th>
                  {WEEKDAYS.map((day) => (
                    <th
                      key={day}
                      className="border-b border-l border-slate-200 dark:border-slate-800 px-3 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 last:border-l-0"
                    >
                      {DAY_LABELS[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period}>
                    <td className="border-b border-l border-slate-200 dark:border-slate-800 bg-slate-50/80 px-3 py-3 font-bold text-slate-600">
                      {period}
                    </td>
                    {WEEKDAYS.map((day) => {
                      const cell = classFilter
                        ? gridMap.get(`${day}-${period}`)
                        : items.find(
                            (i) =>
                              i.day_of_week === day &&
                              i.period_number === period
                          );
                      return (
                        <td
                          key={`${day}-${period}`}
                          className="border-b border-l border-slate-200 dark:border-slate-800 p-1.5 last:border-l-0"
                        >
                          {cell ? (
                            <button
                              type="button"
                              onClick={() => openEdit(cell)}
                              className="w-full rounded-xl bg-teal-50 p-2 text-right transition hover:bg-teal-100"
                            >
                              <p className="text-xs font-bold text-teal-900">
                                {cell.subject}
                              </p>
                              <p className="text-[11px] text-teal-700/80">
                                {cell.class_name}
                              </p>
                              {cell.room && (
                                <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-400 ">
                                  {cell.room}
                                </p>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openCreate(day, period)}
                              className="flex h-14 w-full items-center justify-center rounded-xl text-slate-300 hover:bg-slate-50 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-400 "
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
            {items.map((item) => (
              <article key={item.id} className="glass-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                      {item.subject}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 ">
                      {item.class_name} · {DAY_LABELS[item.day_of_week]} ·
                      الحصة {item.period_number}
                      {item.room ? ` · ${item.room}` : ""}
                    </p>
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
              </article>
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل الحصة" : "إضافة حصة"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
          <Input
            label="اسم الفصل"
            name="class_name"
            required
            list="class-names-list"
            value={form.class_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, class_name: e.target.value }))
            }
          />
          <datalist id="class-names-list">
            {classes.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="اليوم"
              name="day_of_week"
              value={form.day_of_week}
              onChange={(e) =>
                setForm((f) => ({
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
              label="رقم الحصة"
              name="period_number"
              value={form.period_number}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  period_number: Number(e.target.value),
                }))
              }
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  الحصة {p}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="المادة"
            name="subject"
            required
            value={form.subject}
            onChange={(e) =>
              setForm((f) => ({ ...f, subject: e.target.value }))
            }
          />
          <Input
            label="القاعة (اختياري)"
            name="room"
            value={form.room}
            onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
          />
          <div className="flex flex-wrap justify-between gap-2">
            {editing ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setModalOpen(false);
                  setDeleteId(editing.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
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
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف الحصة"
        message="هل أنت متأكد من حذف هذه الحصة؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
