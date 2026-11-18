"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  createTimetable,
  deleteTimetable,
  getTimetables,
  toggleTimetableActive,
  updateTimetable,
} from "@/app/admin/teacher-space/actions";
import { safeExternalHref } from "@/lib/social";
import { uploadMaterialPdf } from "@/lib/storage";
import {
  TIMETABLE_DAYS,
  emptyTimetableGrid,
  exportTimetablePdf,
  resizeTimetableGrid,
  type TimetableGrid,
} from "@/lib/timetable-pdf";
import type { TeacherTimetable } from "@/lib/types";
import { StageGradeFields } from "@/components/teacher-space/stage-grade-fields";
import {
  ActiveField,
  AddButton,
  DeleteDialog,
  FormActions,
  FormError,
  ListShell,
  RowActions,
  SectionLoading,
  gradeName,
  rowClass,
  selectClass,
  stageName,
  type StageGradeProps,
} from "@/components/teacher-space/panel-ui";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  title: "",
  file_url: "",
  stage_id: "",
  grade_id: "",
  is_active: true,
};

export function TimetablesPanel({ stages, grades }: StageGradeProps) {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TeacherTimetable[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeacherTimetable | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [periodCount, setPeriodCount] = useState(6);
  const [grid, setGrid] = useState<TimetableGrid>(() => emptyTimetableGrid());
  const previewRef = useRef<HTMLDivElement>(null);

  const stageLabel = useMemo(
    () => stageName(stages, form.stage_id || null),
    [form.stage_id, stages]
  );
  const gradeLabel = useMemo(
    () => gradeName(grades, form.grade_id || null),
    [form.grade_id, grades]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTimetables();
      if (result.success && result.data) setItems(result.data);
      else if (!result.success) error(result.error);
    } catch (err) {
      console.error("[timetables-panel] load:", err);
      error("تعذر تحميل الجداول");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFileName(null);
    setFormError(null);
    setPeriodCount(6);
    setGrid(emptyTimetableGrid(TIMETABLE_DAYS, 6));
    setModalOpen(true);
  }

  function openEdit(item: TeacherTimetable) {
    setEditing(item);
    setForm({
      title: item.title,
      file_url: item.file_url,
      stage_id: item.stage_id ?? "",
      grade_id: item.grade_id ?? "",
      is_active: item.is_active,
    });
    setFileName(item.file_url ? "ملف محفوظ" : null);
    setFormError(null);
    setPeriodCount(6);
    setGrid(emptyTimetableGrid(TIMETABLE_DAYS, 6));
    setModalOpen(true);
  }

  function setPeriod(count: number) {
    const next = Math.min(10, Math.max(3, count));
    setPeriodCount(next);
    setGrid((g) => resizeTimetableGrid(g, TIMETABLE_DAYS, next));
  }

  function setCell(day: string, periodIndex: number, value: string) {
    setGrid((prev) => {
      const row = [...(prev[day] ?? Array.from({ length: periodCount }, () => ""))];
      row[periodIndex] = value;
      return { ...prev, [day]: row };
    });
  }

  async function uploadPdfFile(file: File) {
    setFormError(null);
    setUploading(true);
    try {
      const result = await uploadMaterialPdf(file);
      if (result.success && result.data) {
        setForm((f) => ({ ...f, file_url: result.data!.publicUrl }));
        setFileName(file.name);
        success(result.message ?? "تم رفع PDF");
        return result.data.publicUrl;
      }
      if (!result.success) {
        setFormError(result.error);
        error(result.error);
      }
      return null;
    } catch (err) {
      console.error("[timetables-panel] upload:", err);
      const message = err instanceof Error ? err.message : "فشل رفع الملف";
      setFormError(message);
      error(message);
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleGeneratePdf(andUpload: boolean) {
    if (!form.title.trim()) {
      setFormError("أدخل عنوان الجدول قبل التوليد");
      return;
    }
    if (!previewRef.current) {
      setFormError("تعذر العثور على معاينة الجدول");
      return;
    }
    setGenerating(true);
    setFormError(null);
    try {
      const blob = await exportTimetablePdf(
        previewRef.current,
        {
          title: form.title.trim(),
          stageName: stageLabel === "—" ? "" : stageLabel,
          gradeName: gradeLabel === "—" ? "" : gradeLabel,
          brand: "منصة طارق",
        },
        `${form.title.trim() || "جدول-حصص"}.pdf`
      );

      success("تم توليد ملف PDF وتنزيله");

      if (andUpload) {
        const file = new File(
          [blob],
          `${form.title.trim() || "timetable"}.pdf`,
          { type: "application/pdf" }
        );
        await uploadPdfFile(file);
      }
    } catch (err) {
      console.error("[timetables-panel] generate:", err);
      const message =
        err instanceof Error ? err.message : "فشل توليد ملف PDF";
      setFormError(message);
      error(message);
    } finally {
      setGenerating(false);
    }
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) {
      setFormError("العنوان مطلوب");
      return;
    }
    if (!form.file_url.trim()) {
      setFormError("ولّد PDF أو ارفع ملفاً قبل الحفظ");
      return;
    }
    if (!form.stage_id || !form.grade_id) {
      setFormError("اختر المرحلة والصف");
      return;
    }
    startTransition(async () => {
      try {
        const result = editing
          ? await updateTimetable(editing.id, form)
          : await createTimetable(form);
        if (result.success && result.data) {
          setItems((prev) =>
            editing
              ? prev.map((x) => (x.id === editing.id ? result.data! : x))
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ والنشر");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[timetables-panel] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function handleToggle(id: string, is_active: boolean) {
    const previous = items;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_active } : x)));
    startTransition(async () => {
      try {
        const result = await toggleTimetableActive(id, is_active);
        if (result.success && result.data) {
          setItems((prev) => prev.map((x) => (x.id === id ? result.data! : x)));
          success(
            is_active
              ? "الجدول ظاهر الآن على المنصة"
              : "تم إخفاء الجدول عن المنصة"
          );
        } else if (!result.success) {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[timetables-panel] toggle:", err);
        setItems(previous);
        error("تعذر التحديث");
      }
    });
  }

  function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    startTransition(async () => {
      const previous = items;
      setItems((prev) => prev.filter((x) => x.id !== id));
      try {
        const result = await deleteTimetable(id);
        if (result.success) success(result.message ?? "تم الحذف");
        else {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[timetables-panel] delete:", err);
        setItems(previous);
        error("تعذر الحذف");
      }
    });
  }

  if (loading) return <SectionLoading />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          صانع جداول الحصص — أدخل الحصص ثم ولّد PDF واحفظه مع مفتاح التفعيل.
        </p>
        <AddButton label="إنشاء جدول جديد" onClick={openCreate} />
      </div>

      <ListShell empty={items.length === 0} emptyText="لا توجد جداول بعد — أنشئ أول جدول">
        {items.map((item) => {
          const href = safeExternalHref(item.file_url);
          return (
            <article key={item.id} className={rowClass}>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {stageName(stages, item.stage_id)} ·{" "}
                  {gradeName(grades, item.grade_id)}
                </p>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    عرض PDF
                  </a>
                ) : null}
              </div>
              <RowActions
                isActive={item.is_active}
                pending={pending}
                onToggle={(v) => handleToggle(item.id, v)}
                onEdit={() => openEdit(item)}
                onDelete={() => setDeleteId(item.id)}
              />
            </article>
          );
        })}
      </ListShell>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل جدول الحصص" : "صانع ومنشئ جداول الحصص"}
        size="3xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">عنوان الجدول</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="مثال: جدول الصف الأول — الفصل الأول"
              className={selectClass}
            />
          </label>

          <StageGradeFields
            stages={stages}
            grades={grades}
            stageId={form.stage_id}
            gradeId={form.grade_id}
            onStageChange={(id) =>
              setForm((f) => ({ ...f, stage_id: id, grade_id: "" }))
            }
            onGradeChange={(id) => setForm((f) => ({ ...f, grade_id: id }))}
          />

          <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-teal-300">شبكة الحصص</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  اكتب اسم المادة في كل خانة (الحصة × اليوم)
                </p>
              </div>
              <label className="block space-y-1 text-xs">
                <span className="text-slate-400">عدد الحصص اليومية</span>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={periodCount}
                  onChange={(e) => setPeriod(Number(e.target.value) || 6)}
                  className={`${selectClass} w-24`}
                />
              </label>
            </div>

            <div className="-mx-1 overflow-x-auto px-1">
              <table className="min-w-[640px] w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-white/10 bg-teal-500/10 px-2 py-2 text-teal-200">
                      اليوم / الحصة
                    </th>
                    {Array.from({ length: periodCount }, (_, i) => (
                      <th
                        key={i}
                        className="border border-white/10 bg-teal-500/10 px-2 py-2 text-teal-200"
                      >
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMETABLE_DAYS.map((day) => (
                    <tr key={day}>
                      <th className="border border-white/10 bg-white/[0.03] px-2 py-1.5 text-slate-200">
                        {day}
                      </th>
                      {Array.from({ length: periodCount }, (_, i) => (
                        <td key={i} className="border border-white/10 p-1">
                          <input
                            value={grid[day]?.[i] ?? ""}
                            onChange={(e) => setCell(day, i, e.target.value)}
                            placeholder="مادة"
                            className="w-full rounded-md border border-transparent bg-slate-900/80 px-1.5 py-1.5 text-center text-[11px] text-slate-100 outline-none focus:border-teal-500/50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Off-screen-ish printable preview used by html2canvas */}
            <div className="overflow-hidden rounded-xl border border-teal-500/20">
              <div
                ref={previewRef}
                dir="rtl"
                className="bg-[#0b1220] p-5 text-white"
                style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
              >
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-teal-500/30 pb-3">
                  <div>
                    <p className="text-xs tracking-[0.2em] text-teal-300">
                      منصة طارق
                    </p>
                    <h3 className="mt-1 text-xl font-extrabold">
                      {form.title.trim() || "جدول الحصص"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {[stageLabel !== "—" ? stageLabel : null, gradeLabel !== "—" ? gradeLabel : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-teal-500/15 px-3 py-2 text-xs font-semibold text-teal-200">
                    جدول أسبوعي
                  </div>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-teal-500/30 bg-teal-500/20 px-2 py-2">
                        اليوم
                      </th>
                      {Array.from({ length: periodCount }, (_, i) => (
                        <th
                          key={i}
                          className="border border-teal-500/30 bg-teal-500/20 px-2 py-2"
                        >
                          الحصة {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIMETABLE_DAYS.map((day) => (
                      <tr key={day}>
                        <th className="border border-teal-500/20 bg-white/5 px-2 py-2 font-bold">
                          {day}
                        </th>
                        {Array.from({ length: periodCount }, (_, i) => (
                          <td
                            key={i}
                            className="border border-teal-500/20 px-2 py-2 text-center text-slate-100"
                          >
                            {(grid[day]?.[i] || "").trim() || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={generating || uploading || pending}
                onClick={() => void handleGeneratePdf(false)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/20 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {generating ? "جاري التوليد..." : "توليد وتصدير PDF"}
              </button>
              <button
                type="button"
                disabled={generating || uploading || pending}
                onClick={() => void handleGeneratePdf(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                توليد ورفع للحفظ
              </button>
            </div>
          </div>

          <PdfField
            fileUrl={form.file_url}
            fileName={fileName}
            uploading={uploading}
            disabled={uploading || pending || generating}
            onFile={(file) => {
              if (file) void uploadPdfFile(file);
            }}
          />

          <ActiveField
            checked={form.is_active}
            onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />

          <FormError message={formError} />
          <FormActions
            pending={pending}
            disabled={uploading || generating}
            onCancel={() => setModalOpen(false)}
          />
        </form>
      </Modal>

      <DeleteDialog
        open={!!deleteId}
        title="حذف الجدول"
        message="هل أنت متأكد من حذف هذا الجدول؟"
        pending={pending}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function PdfField({
  fileUrl,
  fileName,
  uploading,
  disabled,
  onFile,
}: {
  fileUrl: string;
  fileName: string | null;
  uploading: boolean;
  disabled: boolean;
  onFile: (file: File | null) => void;
}) {
  const href = safeExternalHref(fileUrl);
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">ملف PDF (مولَّد أو مرفوع يدوياً)</span>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 px-4 py-5 text-center transition hover:border-teal-400 hover:bg-teal-500/10">
        <Upload className="h-6 w-6 text-teal-400" />
        <span className="text-sm font-medium text-slate-200">
          {uploading ? "جاري الرفع إلى التخزين..." : "أو ارفع ملف PDF جاهزاً"}
        </span>
        {fileName ? (
          <span className="inline-flex items-center gap-1 text-xs text-teal-300">
            <FileText className="h-3.5 w-3.5" />
            {fileName}
          </span>
        ) : null}
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            onFile(file);
          }}
        />
      </label>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          معاينة الملف المرتبط بالجدول
        </a>
      ) : null}
    </div>
  );
}
