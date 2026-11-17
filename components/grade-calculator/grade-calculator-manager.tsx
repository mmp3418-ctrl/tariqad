"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Calculator,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  Grade,
  GradeCalculatorTool,
  GradeRecord,
  Unit,
} from "@/lib/types";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import { getUnitsByGrade } from "@/app/(dashboard)/units/actions";
import {
  createGradeCalculatorTool,
  createGradeRecord,
  deleteGradeCalculatorTool,
  deleteGradeRecord,
  getGradeCalculatorTools,
  getGradeRecords,
  updateGradeCalculatorTool,
  updateGradeRecord,
} from "@/app/(dashboard)/grade-calculator/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

type Tab = "tools" | "records";

const emptyTool = {
  title_ar: "",
  description_ar: "",
  url: "",
  grade_id: "",
  unit_id: "",
  max_score: 100,
  is_coming_soon: false,
};

const emptyRecord = {
  student_name: "",
  grade_id: "",
  unit_id: "",
  score: 0,
  max_score: 100,
  notes: "",
};

export function GradeCalculatorManager() {
  const { success, error } = useToast();
  const [tab, setTab] = useState<Tab>("tools");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [formUnits, setFormUnits] = useState<Unit[]>([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [tools, setTools] = useState<GradeCalculatorTool[]>([]);
  const [records, setRecords] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolModal, setToolModal] = useState(false);
  const [recordModal, setRecordModal] = useState(false);
  const [editingTool, setEditingTool] = useState<GradeCalculatorTool | null>(
    null
  );
  const [editingRecord, setEditingRecord] = useState<GradeRecord | null>(null);
  const [deleteToolId, setDeleteToolId] = useState<string | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [toolForm, setToolForm] = useState(emptyTool);
  const [recordForm, setRecordForm] = useState(emptyRecord);
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
    const filters = {
      grade_id: gradeFilter || undefined,
      unit_id: unitFilter || undefined,
    };
    const [toolsRes, recordsRes] = await Promise.all([
      getGradeCalculatorTools(filters),
      getGradeRecords(filters),
    ]);
    if (toolsRes.success) setTools(toolsRes.data ?? []);
    else error(toolsRes.error);
    if (recordsRes.success) setRecords(recordsRes.data ?? []);
    else error(recordsRes.error);
    setLoading(false);
  }, [gradeFilter, unitFilter, error]);

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
    const gid = tab === "tools" ? toolForm.grade_id : recordForm.grade_id;
    void loadFormUnits(gid);
  }, [tab, toolForm.grade_id, recordForm.grade_id, loadFormUnits]);

  function openCreateTool() {
    setEditingTool(null);
    setToolForm({
      ...emptyTool,
      grade_id: gradeFilter || "",
      unit_id: unitFilter || "",
    });
    setToolModal(true);
  }

  function openEditTool(item: GradeCalculatorTool) {
    setEditingTool(item);
    setToolForm({
      title_ar: item.title_ar,
      description_ar: item.description_ar ?? "",
      url: item.url,
      grade_id: item.grade_id,
      unit_id: item.unit_id,
      max_score: item.max_score,
      is_coming_soon: item.is_coming_soon,
    });
    setToolModal(true);
  }

  function openCreateRecord() {
    setEditingRecord(null);
    setRecordForm({
      ...emptyRecord,
      grade_id: gradeFilter || "",
      unit_id: unitFilter || "",
    });
    setRecordModal(true);
  }

  function openEditRecord(item: GradeRecord) {
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

  function submitTool(e: React.FormEvent) {
    e.preventDefault();
    if (!toolForm.grade_id || !toolForm.unit_id) {
      error("اختر الصف ثم الوحدة");
      return;
    }
    startTransition(async () => {
      const result = editingTool
        ? await updateGradeCalculatorTool(editingTool.id, toolForm)
        : await createGradeCalculatorTool(toolForm);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setToolModal(false);
        await load();
      } else error(result.error);
    });
  }

  function submitRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!recordForm.grade_id || !recordForm.unit_id) {
      error("اختر الصف ثم الوحدة");
      return;
    }
    startTransition(async () => {
      const result = editingRecord
        ? await updateGradeRecord(editingRecord.id, recordForm)
        : await createGradeRecord(recordForm);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setRecordModal(false);
        await load();
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <Calculator className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">أداة جمع الدرجات</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            أدوات الدرجات وسجلات الطلاب
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            إدارة أدوات الحساب وسجلات الدرجات حسب الصف والوحدة
          </p>
        </div>
        <Button
          onClick={() =>
            tab === "tools" ? openCreateTool() : openCreateRecord()
          }
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          {tab === "tools" ? "أداة جديدة" : "درجة جديدة"}
        </Button>
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
          أدوات الحساب
        </button>
        <button
          type="button"
          onClick={() => setTab("records")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
            tab === "records"
              ? "bg-teal-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          سجلات الدرجات
        </button>
      </div>

      <div className="glass-card grid gap-4 p-4 sm:grid-cols-2">
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
      </div>

      {loading ? (
        <PageLoader />
      ) : tab === "tools" ? (
        tools.length === 0 ? (
          <EmptyState
            title="لا توجد أدوات بعد"
            description="أضف أداة جمع درجات مرتبطة بصف ووحدة"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tools.map((item) => (
              <article key={item.id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{item.title_ar}</p>
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
                      <span className="badge badge-success">
                        من {item.max_score}
                      </span>
                      {item.is_coming_soon && (
                        <span className="badge badge-warning">قريباً</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditTool(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteToolId(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  فتح الأداة
                </a>
              </article>
            ))}
          </div>
        )
      ) : records.length === 0 ? (
        <EmptyState
          title="لا توجد سجلات درجات"
          description="سجّل درجات الطلاب لكل صف ووحدة"
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600">
              <tr>
                <th className="px-3 py-3">الطالب</th>
                <th className="px-3 py-3">الصف</th>
                <th className="px-3 py-3">الوحدة</th>
                <th className="px-3 py-3">الدرجة</th>
                <th className="px-3 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-3 font-semibold text-slate-900">
                    {item.student_name}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {item.grades?.title_ar ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {item.units?.title_ar ?? "—"}
                  </td>
                  <td className="px-3 py-3 font-bold text-teal-800">
                    {item.score} / {item.max_score}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditRecord(item)}
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

      <Modal
        open={toolModal}
        onClose={() => setToolModal(false)}
        title={editingTool ? "تعديل الأداة" : "إضافة أداة جمع درجات"}
      >
        <form onSubmit={submitTool} className="space-y-4 overflow-x-hidden">
          <Select
            label="الصف"
            name="grade_id"
            required
            value={toolForm.grade_id}
            onChange={(e) =>
              setToolForm((f) => ({
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
            disabled={!toolForm.grade_id}
            value={toolForm.unit_id}
            onChange={(e) =>
              setToolForm((f) => ({ ...f, unit_id: e.target.value }))
            }
          >
            <option value="">
              {toolForm.grade_id ? "اختر الوحدة" : "اختر الصف أولاً"}
            </option>
            {formUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title_ar}
              </option>
            ))}
          </Select>
          <Input
            label="عنوان الأداة"
            name="title_ar"
            required
            value={toolForm.title_ar}
            onChange={(e) =>
              setToolForm((f) => ({ ...f, title_ar: e.target.value }))
            }
          />
          <Textarea
            label="وصف"
            name="description_ar"
            value={toolForm.description_ar}
            onChange={(e) =>
              setToolForm((f) => ({ ...f, description_ar: e.target.value }))
            }
          />
          <Input
            label="رابط الأداة"
            name="url"
            dir="ltr"
            required
            value={toolForm.url}
            onChange={(e) =>
              setToolForm((f) => ({ ...f, url: e.target.value }))
            }
          />
          <Input
            label="الدرجة القصوى"
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={toolForm.is_coming_soon}
              onChange={(e) =>
                setToolForm((f) => ({
                  ...f,
                  is_coming_soon: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-700"
            />
            تعليم كـ «قريباً»
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setToolModal(false)}
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
        open={recordModal}
        onClose={() => setRecordModal(false)}
        title={editingRecord ? "تعديل الدرجة" : "تسجيل درجة"}
      >
        <form onSubmit={submitRecord} className="space-y-4 overflow-x-hidden">
          <Select
            label="الصف"
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
            disabled={!recordForm.grade_id}
            value={recordForm.unit_id}
            onChange={(e) =>
              setRecordForm((f) => ({ ...f, unit_id: e.target.value }))
            }
          >
            <option value="">
              {recordForm.grade_id ? "اختر الوحدة" : "اختر الصف أولاً"}
            </option>
            {formUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title_ar}
              </option>
            ))}
          </Select>
          <Input
            label="اسم الطالب"
            name="student_name"
            required
            value={recordForm.student_name}
            onChange={(e) =>
              setRecordForm((f) => ({ ...f, student_name: e.target.value }))
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="الدرجة"
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
              label="من أصل"
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
            label="ملاحظات"
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
              إلغاء
            </Button>
            <Button type="submit" loading={pending}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteToolId}
        title="حذف الأداة"
        message="هل أنت متأكد من حذف هذه الأداة؟"
        onCancel={() => setDeleteToolId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteToolId) return;
            const r = await deleteGradeCalculatorTool(deleteToolId);
            if (r.success) {
              success(r.message ?? "تم الحذف");
              setDeleteToolId(null);
              await load();
            } else error(r.error);
          })
        }
        loading={pending}
      />

      <ConfirmDialog
        open={!!deleteRecordId}
        title="حذف السجل"
        message="هل أنت متأكد من حذف سجل الدرجة؟"
        onCancel={() => setDeleteRecordId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteRecordId) return;
            const r = await deleteGradeRecord(deleteRecordId);
            if (r.success) {
              success(r.message ?? "تم الحذف");
              setDeleteRecordId(null);
              await load();
            } else error(r.error);
          })
        }
        loading={pending}
      />
    </div>
  );
}
