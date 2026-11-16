"use client";

import { useCallback, useEffect, useState, useTransition, type ComponentType } from "react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Link2,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import type {
  BadgeColor,
  Grade,
  ResourceIconType,
  ResourceType,
  ResourceWithGrade,
} from "@/lib/types";
import {
  BADGE_COLOR_OPTIONS,
  RESOURCE_ICON_OPTIONS,
  RESOURCE_TYPE_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import {
  createResource,
  deleteResource,
  getResources,
  updateResource,
} from "@/app/(dashboard)/resources/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const RESOURCE_ICONS: Record<
  ResourceIconType,
  ComponentType<{ className?: string }>
> = {
  "file-text": FileText,
  "book-open": BookOpen,
  video: Video,
  youtube: Video,
  link: Link2,
  "graduation-cap": GraduationCap,
  notebook: NotebookPen,
};

const emptyForm = {
  grade_id: "",
  type: "pdf" as ResourceType,
  title_ar: "",
  title_en: "",
  subject_ar: "",
  subject_en: "",
  term: "",
  url: "",
  description_ar: "",
  description_en: "",
  badge_color: "teal" as BadgeColor,
  icon_type: "file-text" as ResourceIconType,
};

export function ResourcesManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<ResourceWithGrade[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceWithGrade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const loadGrades = useCallback(async () => {
    const result = await getGrades();
    if (result.success) {
      setGrades(result.data ?? []);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getResources(gradeFilter || undefined);
    if (result.success) {
      setItems(result.data ?? []);
    } else {
      error(result.error);
    }
    setLoading(false);
  }, [gradeFilter, error]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      grade_id: gradeFilter || grades[0]?.id || "",
      icon_type: "file-text",
    });
    setModalOpen(true);
  }

  function openEdit(resource: ResourceWithGrade) {
    setEditing(resource);
    setForm({
      grade_id: resource.grade_id,
      type: resource.type,
      title_ar: resource.title_ar,
      title_en: resource.title_en,
      subject_ar: resource.subject_ar,
      subject_en: resource.subject_en,
      term: resource.term ?? "",
      url: resource.url,
      description_ar: resource.description_ar ?? "",
      description_en: resource.description_en ?? "",
      badge_color: resource.badge_color || "teal",
      icon_type: resource.icon_type || "file-text",
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateResource(editing.id, form)
        : await createResource(form);

      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        setEditing(null);
        await load();
      } else {
        error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteResource(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await load();
      } else {
        error(result.error);
      }
    });
  }

  const PreviewIcon = RESOURCE_ICONS[form.icon_type] ?? FileText;
  const previewColor =
    BADGE_COLOR_OPTIONS.find((c) => c.value === form.badge_color)?.swatch ??
    "#0f766e";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-semibold">المذكرات والشروحات</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            إدارة الموارد التعليمية
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ملفات PDF وقوائم تشغيل مع تخصيص بطاقة العرض (وصف، لون، أيقونة)
          </p>
        </div>
        <Button onClick={openCreate} disabled={grades.length === 0}>
          <Plus className="h-4 w-4" />
          مورد جديد
        </Button>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <Filter className="h-4 w-4" />
          تصفية حسب الصف
        </div>
        <div className="min-w-[220px] flex-1">
          <Select
            label=""
            name="grade_filter"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <option value="">كل الصفوف</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title_ar} — {STAGE_LABELS[g.stage]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {grades.length === 0 && !loading ? (
        <EmptyState
          title="أضف صفوفاً دراسية أولاً"
          description="يجب إنشاء الصفوف قبل إضافة المذكرات والشروحات"
        />
      ) : loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          title="لا توجد موارد"
          description="أضف مذكرة PDF أو قائمة تشغيل لهذا الفلتر"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const Icon = RESOURCE_ICONS[item.icon_type] ?? FileText;
            const color =
              BADGE_COLOR_OPTIONS.find((c) => c.value === item.badge_color)
                ?.swatch ?? "#0f766e";
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: `${color}18`,
                      color,
                    }}
                  >
                    {RESOURCE_TYPE_LABELS[item.type]}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {item.title_ar}
                </h3>
                {item.description_ar && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {item.description_ar}
                  </p>
                )}
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>
                    <span className="font-semibold text-slate-700">المادة:</span>{" "}
                    {item.subject_ar || "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">الصف:</span>{" "}
                    {item.grades?.title_ar ?? "—"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">الفصل:</span>{" "}
                    {item.term || "—"}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    فتح الرابط
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
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
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل المورد" : "إضافة مورد جديد"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="الصف الدراسي"
              name="grade_id"
              required
              value={form.grade_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, grade_id: e.target.value }))
              }
            >
              <option value="" disabled>
                اختر الصف
              </option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title_ar}
                </option>
              ))}
            </Select>
            <Select
              label="النوع"
              name="type"
              required
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as ResourceType,
                  icon_type:
                    e.target.value === "playlist" && f.icon_type === "file-text"
                      ? "youtube"
                      : f.icon_type,
                }))
              }
            >
              <option value="pdf">{RESOURCE_TYPE_LABELS.pdf}</option>
              <option value="playlist">{RESOURCE_TYPE_LABELS.playlist}</option>
            </Select>
            <Input
              label="العنوان (عربي)"
              name="title_ar"
              required
              value={form.title_ar}
              onChange={(e) =>
                setForm((f) => ({ ...f, title_ar: e.target.value }))
              }
            />
            <Input
              label="العنوان (إنجليزي)"
              name="title_en"
              dir="ltr"
              value={form.title_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, title_en: e.target.value }))
              }
            />
            <Input
              label="المادة (عربي)"
              name="subject_ar"
              required
              value={form.subject_ar}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject_ar: e.target.value }))
              }
            />
            <Input
              label="المادة (إنجليزي)"
              name="subject_en"
              dir="ltr"
              value={form.subject_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject_en: e.target.value }))
              }
            />
            <Input
              label="الفصل الدراسي"
              name="term"
              value={form.term}
              placeholder="الفصل الأول / الثاني"
              onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
            />
            <Input
              label="الرابط"
              name="url"
              type="url"
              required
              dir="ltr"
              value={form.url}
              placeholder="https://"
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea
              label="وصف البطاقة (عربي)"
              name="description_ar"
              value={form.description_ar}
              placeholder="وصف مختصر يظهر على بطاقة المورد..."
              onChange={(e) =>
                setForm((f) => ({ ...f, description_ar: e.target.value }))
              }
            />
            <Textarea
              label="وصف البطاقة (إنجليزي)"
              name="description_en"
              dir="ltr"
              value={form.description_en}
              placeholder="Short card description..."
              onChange={(e) =>
                setForm((f) => ({ ...f, description_en: e.target.value }))
              }
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <h4 className="mb-3 text-sm font-bold text-slate-800">
              تخصيص بطاقة العرض
            </h4>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <Select
                label="لون الشارة"
                name="badge_color"
                value={form.badge_color}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    badge_color: e.target.value as BadgeColor,
                  }))
                }
              >
                {BADGE_COLOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Select
                label="نوع الأيقونة"
                name="icon_type"
                value={form.icon_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    icon_type: e.target.value as ResourceIconType,
                  }))
                }
              >
                {RESOURCE_ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">معاينة</span>
                <div
                  className="flex h-[46px] w-[46px] items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: previewColor }}
                >
                  <PreviewIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "حفظ التعديلات" : "إضافة المورد"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المورد"
        message="هل أنت متأكد من حذف هذا المورد؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
