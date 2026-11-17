"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  Grade,
  PdfBook,
  PdfBookCategory,
  QuestionData,
  QuestionDifficulty,
  TargetAudience,
  Unit,
} from "@/lib/types";
import {
  PDF_TEACHER_CATEGORY_OPTIONS,
  QUESTION_DIFFICULTY_OPTIONS,
  RESOURCE_CATEGORY_OPTIONS,
  STAGE_LABELS,
  TARGET_AUDIENCE_OPTIONS,
} from "@/lib/constants";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import { getUnitsByGrade } from "@/app/(dashboard)/units/actions";
import {
  createPdfBook,
  deletePdfBook,
  getPdfBooks,
  updatePdfBook,
} from "@/app/(dashboard)/admin/pdf-books/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const emptyQuestion = (): QuestionData => ({
  question_text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  difficulty: "medium",
});

const emptyForm = {
  grade_id: "",
  unit_id: "",
  title_ar: "",
  file_url: "",
  description_ar: "",
  target_audience: "student" as TargetAudience,
  resource_category: "" as PdfBookCategory | "",
  question_data: emptyQuestion(),
  is_coming_soon: false,
};

function categoryLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const student = RESOURCE_CATEGORY_OPTIONS.find((c) => c.value === value);
  if (student) return student.label;
  const teacher = PDF_TEACHER_CATEGORY_OPTIONS.find((c) => c.value === value);
  if (teacher) return teacher.label;
  return value;
}

function audienceLabel(value: TargetAudience | null | undefined): string {
  if (value === "teacher") return "معلم";
  if (value === "student") return "طالب";
  return "—";
}

export function PdfBooksManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<PdfBook[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [audienceFilter, setAudienceFilter] = useState<"" | TargetAudience>("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PdfBook | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(emptyForm);

  const isQuestionBank =
    form.target_audience === "teacher" &&
    form.resource_category === "question_banks";

  const visibleItems = useMemo(() => {
    if (!audienceFilter) return items;
    return items.filter((i) => i.target_audience === audienceFilter);
  }, [items, audienceFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const [booksRes, gradesRes] = await Promise.all([
      getPdfBooks(),
      getGrades(),
    ]);
    if (booksRes.success) setItems(booksRes.data ?? []);
    else error(booksRes.error);
    if (gradesRes.success) setGrades(gradesRes.data ?? []);
    setLoading(false);
  }, [error]);

  const loadUnits = useCallback(async (gradeId: string) => {
    if (!gradeId) {
      setUnits([]);
      return;
    }
    const result = await getUnitsByGrade(gradeId);
    if (result.success) {
      setUnits(
        (result.data ?? []).map((u) => ({
          id: u.id,
          grade_id: u.grade_id,
          title_ar: u.title_ar,
          title_en: u.title_en,
          sort_order: u.sort_order,
          is_coming_soon: u.is_coming_soon,
        }))
      );
    } else {
      setUnits([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadUnits(form.grade_id);
  }, [form.grade_id, loadUnits]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setUnits([]);
    setModalOpen(true);
  }

  function openEdit(item: PdfBook) {
    setEditing(item);
    setForm({
      grade_id: item.grade_id,
      unit_id: item.unit_id ?? "",
      title_ar: item.title_ar,
      file_url: item.url && item.url !== "inline-question" ? item.url : "",
      description_ar: item.description_ar ?? "",
      target_audience: item.target_audience ?? "student",
      resource_category: (item.resource_category as PdfBookCategory | "") || "",
      question_data: item.question_data ?? emptyQuestion(),
      is_coming_soon: item.is_coming_soon ?? false,
    });
    setModalOpen(true);
  }

  function setAudience(next: TargetAudience) {
    setForm((f) => ({
      ...f,
      target_audience: next,
      resource_category: "",
      unit_id: next === "student" ? f.unit_id : f.unit_id,
      question_data: emptyQuestion(),
    }));
  }

  function setCategory(value: PdfBookCategory | "") {
    setForm((f) => ({
      ...f,
      resource_category: value,
      question_data:
        value === "question_banks" ? f.question_data : emptyQuestion(),
    }));
  }

  function updateQuestion<K extends keyof QuestionData>(
    key: K,
    value: QuestionData[K]
  ) {
    setForm((f) => ({
      ...f,
      question_data: { ...f.question_data, [key]: value },
    }));
  }

  function updateOption(index: number, value: string) {
    setForm((f) => {
      const options = [...f.question_data.options] as [
        string,
        string,
        string,
        string,
      ];
      options[index] = value;
      return {
        ...f,
        question_data: { ...f.question_data, options },
      };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        ...form,
        question_data: isQuestionBank ? form.question_data : null,
      };
      const result = editing
        ? await updatePdfBook(editing.id, payload)
        : await createPdfBook(payload);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        setEditing(null);
        await load();
      } else error(result.error);
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deletePdfBook(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await load();
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold">المستندات والكتب</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            إدارة كتب ومستندات PDF
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            رفع وإدارة ملفات الطلاب والمعلمين مع تصنيفات ديناميكية وبنك أسئلة
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4" />
          مستند جديد
        </Button>
      </header>

      <div className="glass-card p-4">
        <Select
          label="تصفية حسب الفئة المستهدفة"
          name="audience_filter"
          value={audienceFilter}
          onChange={(e) =>
            setAudienceFilter(e.target.value as "" | TargetAudience)
          }
        >
          <option value="">الكل</option>
          {TARGET_AUDIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="لا توجد مستندات PDF"
          description="أضف مستنداً جديداً واختر الفئة المستهدفة (طالب أو معلم)"
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>العنوان</th>
                <th>الفئة المستهدفة</th>
                <th>الوحدة / المادة</th>
                <th>التصنيف</th>
                <th>الصف</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.title_ar}
                    </div>
                    {item.is_coming_soon && (
                      <span className="badge badge-warning mt-1">قريباً</span>
                    )}
                    {item.resource_category === "question_banks" && (
                      <span className="badge badge-info mt-1 ms-1">
                        بنك أسئلة
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-muted">
                      {audienceLabel(item.target_audience)}
                    </span>
                  </td>
                  <td className="text-slate-600 dark:text-slate-400">
                    {item.units?.title_ar ?? "—"}
                  </td>
                  <td className="text-slate-600 dark:text-slate-400">
                    {categoryLabel(item.resource_category)}
                  </td>
                  <td className="text-slate-600 dark:text-slate-400">
                    {item.grades?.title_ar
                      ? `${item.grades.title_ar}${
                          item.grades.stage
                            ? ` · ${STAGE_LABELS[item.grades.stage]}`
                            : ""
                        }`
                      : "—"}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1">
                      {item.url && item.url !== "inline-question" && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          aria-label="فتح الملف"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
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
        title={editing ? "تعديل مستند PDF" : "مستند PDF جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 transition-all">
          <Select
            label="الفئة المستهدفة (Target)"
            name="target_audience"
            required
            value={form.target_audience}
            onChange={(e) => setAudience(e.target.value as TargetAudience)}
          >
            {TARGET_AUDIENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="الصف الدراسي"
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
              <option value="" disabled>
                اختر الصف
              </option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title_ar} — {STAGE_LABELS[g.stage]}
                </option>
              ))}
            </Select>

            {form.target_audience === "student" ? (
              <Select
                label="الوحدة / المادة"
                name="unit_id"
                required
                value={form.unit_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit_id: e.target.value }))
                }
              >
                <option value="" disabled>
                  اختر الوحدة
                </option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.title_ar}
                  </option>
                ))}
              </Select>
            ) : (
              <Select
                label="الوحدة (اختياري)"
                name="unit_id"
                value={form.unit_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit_id: e.target.value }))
                }
              >
                <option value="">بدون وحدة</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.title_ar}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {form.target_audience === "student" ? (
            <Select
              label="تصنيف المادة (وحدة / مادة)"
              name="resource_category"
              required
              value={form.resource_category}
              onChange={(e) =>
                setCategory(e.target.value as PdfBookCategory | "")
              }
            >
              <option value="" disabled>
                اختر التصنيف
              </option>
              {RESOURCE_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="تصنيف موارد المعلم"
              name="resource_category"
              required
              value={form.resource_category}
              onChange={(e) =>
                setCategory(e.target.value as PdfBookCategory | "")
              }
            >
              <option value="" disabled>
                اختر التصنيف
              </option>
              {PDF_TEACHER_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}

          <Input
            label="عنوان المستند"
            name="title_ar"
            required
            value={form.title_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, title_ar: e.target.value }))
            }
            placeholder={
              isQuestionBank ? "مثال: سؤال الوحدة الأولى" : "عنوان الملف"
            }
          />

          {isQuestionBank ? (
            <div className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 transition-all dark:border-teal-900 dark:bg-teal-950/40">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  بنك الأسئلة — حقول السؤال
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  أدخل نص السؤال والخيارات والإجابة الصحيحة ومستوى الصعوبة
                </p>
              </div>

              <Textarea
                label="نص السؤال"
                name="question_text"
                required
                value={form.question_data.question_text}
                onChange={(e) =>
                  updateQuestion("question_text", e.target.value)
                }
                placeholder="اكتب نص السؤال هنا..."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {form.question_data.options.map((opt, idx) => (
                  <Input
                    key={idx}
                    label={`الخيار ${idx + 1}`}
                    name={`option_${idx}`}
                    required
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                  />
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="الإجابة الصحيحة"
                  name="correct_index"
                  required
                  value={String(form.question_data.correct_index)}
                  onChange={(e) =>
                    updateQuestion(
                      "correct_index",
                      Number(e.target.value) as 0 | 1 | 2 | 3
                    )
                  }
                >
                  {[0, 1, 2, 3].map((i) => (
                    <option key={i} value={i}>
                      الخيار {i + 1}
                      {form.question_data.options[i]
                        ? ` — ${form.question_data.options[i]}`
                        : ""}
                    </option>
                  ))}
                </Select>

                <Select
                  label="مستوى الصعوبة"
                  name="difficulty"
                  required
                  value={form.question_data.difficulty}
                  onChange={(e) =>
                    updateQuestion(
                      "difficulty",
                      e.target.value as QuestionDifficulty
                    )
                  }
                >
                  {QUESTION_DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <FileUpload
                  label="مرفق PDF اختياري"
                  folder="pdf-books"
                  accept="application/pdf,.pdf"
                  preview="file"
                  value={form.file_url || null}
                  onUploaded={(url) =>
                    setForm((f) => ({ ...f, file_url: url }))
                  }
                  onClear={() => setForm((f) => ({ ...f, file_url: "" }))}
                  hint="يمكن إرفاق ملف داعم للسؤال (اختياري)"
                />
                <Input
                  label="أو رابط ملف (اختياري)"
                  name="file_url"
                  value={form.file_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, file_url: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <FileUpload
                label="رفع ملف PDF"
                folder="pdf-books"
                accept="application/pdf,.pdf"
                preview="file"
                value={form.file_url || null}
                onUploaded={(url) => setForm((f) => ({ ...f, file_url: url }))}
                onClear={() => setForm((f) => ({ ...f, file_url: "" }))}
                hint="ارفع الكتاب أو المستند إلى مساحة التخزين"
              />
              <Input
                label="أو الصق رابط الملف"
                name="file_url"
                required={!form.file_url}
                value={form.file_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, file_url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          )}

          {!isQuestionBank && (
            <Textarea
              label="وصف مختصر (اختياري)"
              name="description_ar"
              value={form.description_ar}
              onChange={(e) =>
                setForm((f) => ({ ...f, description_ar: e.target.value }))
              }
            />
          )}

          <Switch
            label="قريباً"
            checked={form.is_coming_soon}
            onChange={(v) => setForm((f) => ({ ...f, is_coming_soon: v }))}
          />

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "حفظ التعديلات" : "حفظ المستند"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المستند"
        message="هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع."
        loading={pending}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
