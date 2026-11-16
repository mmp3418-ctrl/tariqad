"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { TeacherSchedule } from "@/lib/types";
import { DAY_LABELS, PERIODS, WEEKDAYS } from "@/lib/constants";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  getTeacherNames,
  updateSchedule,
} from "@/app/(dashboard)/schedules/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  teacher_name: "",
  day_of_week: 0,
  period_number: 1,
  class_name: "",
  subject: "",
};

type ViewMode = "table" | "grid";

export function SchedulesManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<TeacherSchedule[]>([]);
  const [teachers, setTeachers] = useState<string[]>([]);
  const [teacherFilter, setTeacherFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const loadTeachers = useCallback(async () => {
    const result = await getTeacherNames();
    if (result.success) {
      setTeachers(result.data ?? []);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSchedules(teacherFilter || undefined);
    if (result.success) {
      setItems(result.data ?? []);
    } else {
      error(result.error);
    }
    setLoading(false);
  }, [teacherFilter, error]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    void load();
  }, [load]);

  const gridMap = useMemo(() => {
    const map = new Map<string, TeacherSchedule>();
    for (const item of items) {
      map.set(`${item.day_of_week}-${item.period_number}`, item);
    }
    return map;
  }, [items]);

  function openCreate(day?: number, period?: number) {
    setEditing(null);
    setForm({
      ...emptyForm,
      teacher_name: teacherFilter || "",
      day_of_week: day ?? 0,
      period_number: period ?? 1,
    });
    setModalOpen(true);
  }

  function openEdit(item: TeacherSchedule) {
    setEditing(item);
    setForm({
      teacher_name: item.teacher_name,
      day_of_week: item.day_of_week,
      period_number: item.period_number,
      class_name: item.class_name,
      subject: item.subject,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateSchedule(editing.id, form)
        : await createSchedule(form);

      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        setEditing(null);
        await Promise.all([load(), loadTeachers()]);
      } else {
        error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteSchedule(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await Promise.all([load(), loadTeachers()]);
      } else {
        error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <CalendarDays className="h-5 w-5" />
            <span className="text-sm font-semibold">جداول المعلمين</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            إدارة الجداول الدراسية
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            حصص أسبوعية حسب اليوم والحصة والمعلم
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "grid"
                  ? "bg-teal-700 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              شبكة
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-teal-700 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              قائمة
            </button>
          </div>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            حصة جديدة
          </Button>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <Select
          label="تصفية حسب المعلم"
          name="teacher_filter"
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
        >
          <option value="">كل المعلمين</option>
          {teachers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        {teacherFilter === "" && viewMode === "grid" && (
          <p className="mt-2 text-xs text-slate-500">
            اختر معلماً لعرض شبكته الأسبوعية بوضوح، أو أضف حصة جديدة مباشرة.
          </p>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          title="لا توجد حصص مسجّلة"
          description="أضف أول حصة لبناء جدول المعلمين"
        />
      ) : viewMode === "grid" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] border-collapse text-center text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b border-l border-slate-200 px-3 py-3 text-xs font-bold text-slate-500">
                  الحصة
                </th>
                {WEEKDAYS.map((day) => (
                  <th
                    key={day}
                    className="border-b border-l border-slate-200 px-3 py-3 text-xs font-bold text-slate-700 last:border-l-0"
                  >
                    {DAY_LABELS[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period}>
                  <td className="border-b border-l border-slate-100 bg-slate-50/80 px-3 py-3 font-bold text-slate-600">
                    {period}
                  </td>
                  {WEEKDAYS.map((day) => {
                    const cell = teacherFilter
                      ? gridMap.get(`${day}-${period}`)
                      : items.find(
                          (i) =>
                            i.day_of_week === day && i.period_number === period
                        );

                    return (
                      <td
                        key={`${day}-${period}`}
                        className="border-b border-l border-slate-100 p-1.5 last:border-l-0"
                      >
                        {cell ? (
                          <button
                            type="button"
                            onClick={() => openEdit(cell)}
                            className="w-full rounded-xl bg-teal-50 px-2 py-2 text-right transition hover:bg-teal-100"
                          >
                            <p className="text-xs font-bold text-teal-900">
                              {cell.subject}
                            </p>
                            <p className="text-[11px] text-teal-700/80">
                              {cell.class_name}
                            </p>
                            {!teacherFilter && (
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {cell.teacher_name}
                              </p>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCreate(day, period)}
                            className="flex h-14 w-full items-center justify-center rounded-xl border border-dashed border-transparent text-slate-300 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-500"
                            title="إضافة حصة"
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
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>المعلم</th>
                <th>اليوم</th>
                <th>الحصة</th>
                <th>الفصل</th>
                <th>المادة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.teacher_name}</td>
                  <td>{DAY_LABELS[item.day_of_week]}</td>
                  <td>{item.period_number}</td>
                  <td>{item.class_name}</td>
                  <td>{item.subject}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(item.id)}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل الحصة" : "إضافة حصة جديدة"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="اسم المعلم"
            name="teacher_name"
            required
            list="teacher-names"
            value={form.teacher_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, teacher_name: e.target.value }))
            }
          />
          <datalist id="teacher-names">
            {teachers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="اليوم"
              name="day_of_week"
              required
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
              required
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
            label="اسم الفصل / الصف"
            name="class_name"
            required
            value={form.class_name}
            placeholder="مثال: 7أ"
            onChange={(e) =>
              setForm((f) => ({ ...f, class_name: e.target.value }))
            }
          />
          <Input
            label="المادة"
            name="subject"
            required
            value={form.subject}
            placeholder="مثال: الرياضيات"
            onChange={(e) =>
              setForm((f) => ({ ...f, subject: e.target.value }))
            }
          />
          <div className="flex flex-wrap justify-between gap-2 pt-2">
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
                {editing ? "حفظ التعديلات" : "إضافة الحصة"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف الحصة"
        message="هل أنت متأكد من حذف هذه الحصة من الجدول؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
