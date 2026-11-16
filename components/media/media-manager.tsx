"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type { Grade, ResourceType, ResourceWithGrade } from "@/lib/types";
import {
  CARD_COLOR_PRESETS,
  NOTE_ICON_OPTIONS,
  STAGE_LABELS,
  VIDEO_ICON_OPTIONS,
} from "@/lib/constants";
import { getGrades } from "@/app/(dashboard)/grades/actions";
import {
  createMedia,
  deleteMedia,
  getMediaByType,
  updateMedia,
} from "@/app/(dashboard)/media/actions";
import { MEDIA_ICONS } from "@/components/media/icon-map";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

type Mode = "notes" | "videos";

const COPY: Record<
  Mode,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    addLabel: string;
    icon: typeof Plus;
  }
> = {
  notes: {
    eyebrow: "المذكرات والملخصات",
    title: "إدارة المذكرات PDF",
    subtitle: "رفع ملفات PDF مع غلاف وألوان وأيقونات البطاقة",
    addLabel: "مذكرة جديدة",
    icon: Plus,
  },
  videos: {
    eyebrow: "الشروحات المرئية",
    title: "إدارة الشروحات المرئية",
    subtitle: "روابط يوتيوب مع تخصيص بطاقة العرض",
    addLabel: "شرح جديد",
    icon: Plus,
  },
};

export function MediaManager({ mode }: { mode: Mode }) {
  const type: ResourceType = mode === "notes" ? "pdf" : "video";
  const iconOptions = mode === "notes" ? NOTE_ICON_OPTIONS : VIDEO_ICON_OPTIONS;
  const copy = COPY[mode];
  const { success, error } = useToast();

  const [items, setItems] = useState<ResourceWithGrade[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceWithGrade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<{
    grade_id: string;
    stage: string;
    title_ar: string;
    subject_ar: string;
    url: string;
    description_ar: string;
    badge_color: string;
    icon_type: string;
    cover_image_url: string;
  }>({
    grade_id: "",
    stage: "",
    title_ar: "",
    subject_ar: "",
    url: "",
    description_ar: "",
    badge_color: CARD_COLOR_PRESETS[0],
    icon_type: iconOptions[0],
    cover_image_url: "",
  });

  const filteredGrades = useMemo(
    () =>
      stageFilter
        ? grades.filter((g) => g.stage === stageFilter)
        : grades,
    [grades, stageFilter]
  );

  const visibleItems = useMemo(() => {
    let list = items;
    if (gradeFilter) list = list.filter((i) => i.grade_id === gradeFilter);
    else if (stageFilter) {
      list = list.filter((i) => i.grades?.stage === stageFilter);
    }
    return list;
  }, [items, gradeFilter, stageFilter]);

  const loadGrades = useCallback(async () => {
    const result = await getGrades();
    if (result.success) setGrades(result.data ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMediaByType(type);
    if (result.success) setItems(result.data ?? []);
    else error(result.error);
    setLoading(false);
  }, [type, error]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      grade_id: gradeFilter || filteredGrades[0]?.id || "",
      stage: stageFilter || filteredGrades[0]?.stage || "",
      title_ar: "",
      subject_ar: "",
      url: "",
      description_ar: "",
      badge_color: CARD_COLOR_PRESETS[0],
      icon_type: iconOptions[0],
      cover_image_url: "",
    });
    setModalOpen(true);
  }

  function openEdit(item: ResourceWithGrade) {
    setEditing(item);
    setForm({
      grade_id: item.grade_id,
      stage: item.grades?.stage || "",
      title_ar: item.title_ar,
      subject_ar: item.subject_ar,
      url: item.url,
      description_ar: item.description_ar ?? "",
      badge_color: item.badge_color || CARD_COLOR_PRESETS[0],
      icon_type: item.icon_type || iconOptions[0],
      cover_image_url: item.cover_image_url ?? "",
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        grade_id: form.grade_id,
        type,
        title_ar: form.title_ar,
        subject_ar: form.subject_ar,
        url: form.url,
        description_ar: form.description_ar,
        badge_color: form.badge_color,
        icon_type: form.icon_type,
        cover_image_url: form.cover_image_url,
      };
      const result = editing
        ? await updateMedia(editing.id, payload)
        : await createMedia(payload);
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
      const result = await deleteMedia(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await load();
      } else error(result.error);
    });
  }

  const PreviewIcon = MEDIA_ICONS[form.icon_type] ?? MEDIA_ICONS["file-text"];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 text-sm font-semibold text-teal-700">
            {copy.eyebrow}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
        </div>
        <Button onClick={openCreate} disabled={grades.length === 0}>
          <Plus className="h-4 w-4" />
          {copy.addLabel}
        </Button>
      </header>

      <div className="glass-card grid gap-3 p-4 sm:grid-cols-2">
        <Select
          label="تصفية بالمرحلة"
          name="stage_filter"
          value={stageFilter}
          onChange={(e) => {
            setStageFilter(e.target.value);
            setGradeFilter("");
          }}
        >
          <option value="">كل المراحل</option>
          <option value="primary">{STAGE_LABELS.primary}</option>
          <option value="preparatory">{STAGE_LABELS.preparatory}</option>
          <option value="secondary">{STAGE_LABELS.secondary}</option>
        </Select>
        <Select
          label="تصفية بالصف"
          name="grade_filter"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <option value="">كل الصفوف</option>
          {filteredGrades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title_ar}
            </option>
          ))}
        </Select>
      </div>

      {grades.length === 0 && !loading ? (
        <EmptyState
          title="أضف صفوفاً دراسية أولاً"
          description="يجب إنشاء الصفوف قبل إضافة المحتوى"
        />
      ) : loading ? (
        <PageLoader />
      ) : visibleItems.length === 0 ? (
        <EmptyState title="لا يوجد محتوى بعد" description="أضف عنصراً جديداً للبدء" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const Icon = MEDIA_ICONS[item.icon_type] ?? MEDIA_ICONS["file-text"];
            return (
              <article key={item.id} className="glass-card overflow-hidden">
                {item.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.cover_image_url}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-28 items-center justify-center"
                    style={{ backgroundColor: `${item.badge_color}22` }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: item.badge_color }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <h3 className="font-bold text-slate-900">{item.title_ar}</h3>
                  {item.description_ar && (
                    <p className="line-clamp-2 text-sm text-slate-500">
                      {item.description_ar}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {item.grades?.title_ar} ·{" "}
                    {item.grades ? STAGE_LABELS[item.grades.stage] : "—"}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      فتح
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
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
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل العنصر" : copy.addLabel}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 overflow-x-hidden">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="المرحلة"
              name="stage"
              value={form.stage}
              onChange={(e) => {
                const stage = e.target.value;
                const first = grades.find((g) => g.stage === stage);
                setForm((f) => ({
                  ...f,
                  stage,
                  grade_id: first?.id || "",
                }));
              }}
            >
              <option value="">اختر المرحلة</option>
              <option value="primary">{STAGE_LABELS.primary}</option>
              <option value="preparatory">{STAGE_LABELS.preparatory}</option>
              <option value="secondary">{STAGE_LABELS.secondary}</option>
            </Select>
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
              {grades
                .filter((g) => !form.stage || g.stage === form.stage)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title_ar}
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
            <Input
              label="المادة"
              name="subject_ar"
              value={form.subject_ar}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject_ar: e.target.value }))
              }
            />
          </div>

          <Textarea
            label="شرح بسيط"
            name="description_ar"
            value={form.description_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, description_ar: e.target.value }))
            }
          />

          {mode === "notes" ? (
            <div className="space-y-3">
              <FileUpload
                label="رفع ملف PDF"
                folder="notes"
                accept="application/pdf,.pdf"
                value={form.url}
                preview="file"
                onUploaded={(url) => setForm((f) => ({ ...f, url }))}
                onClear={() => setForm((f) => ({ ...f, url: "" }))}
                hint="ارفع المذكرة مباشرة إلى مساحة التخزين"
              />
              <Input
                label="أو الصق رابط PDF"
                name="url"
                dir="ltr"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
          ) : (
            <Input
              label="رابط يوتيوب / قائمة التشغيل"
              name="url"
              type="url"
              required
              dir="ltr"
              placeholder="https://youtube.com/..."
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          )}

          <FileUpload
            label="صورة الغلاف (اختياري)"
            folder="covers"
            accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
            value={form.cover_image_url}
            onUploaded={(url) =>
              setForm((f) => ({ ...f, cover_image_url: url }))
            }
            onClear={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
          />

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: form.badge_color }}
              >
                {PreviewIcon && <PreviewIcon className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">تخصيص البطاقة</p>
                <p className="text-xs text-slate-500">اللون والأيقونة</p>
              </div>
            </div>

            <p className="mb-2 text-sm font-medium text-slate-700">لون البطاقة</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {CARD_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, badge_color: color }))}
                  className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ${
                    form.badge_color === color
                      ? "ring-teal-700"
                      : "ring-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
              <input
                type="color"
                value={form.badge_color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, badge_color: e.target.value }))
                }
                className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white"
                title="لون مخصص"
              />
            </div>

            <p className="mb-2 text-sm font-medium text-slate-700">الأيقونة</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {iconOptions.map((key) => {
                const Icon = MEDIA_ICONS[key];
                const active = form.icon_type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon_type: key }))}
                    className={`flex h-11 items-center justify-center rounded-xl border transition ${
                      active
                        ? "border-teal-700 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                  </button>
                );
              })}
            </div>
          </div>

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
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
