"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { GraduationCap, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Grade, GradeStage } from "@/lib/types";
import { STAGE_LABELS, slugify } from "@/lib/constants";
import {
  createGrade,
  deleteGrade,
  getGrades,
  seedLibyanGrades,
  updateGrade,
} from "@/app/(dashboard)/grades/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  stage: "primary" as GradeStage,
  title_ar: "",
  title_en: "",
  slug: "",
  sort_order: 0,
};

export function GradesManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getGrades();
    if (result.success) {
      setItems(result.data ?? []);
    } else {
      error(result.error);
    }
    setLoading(false);
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      sort_order: items.length > 0 ? Math.max(...items.map((g) => g.sort_order)) + 1 : 1,
    });
    setModalOpen(true);
  }

  function openEdit(grade: Grade) {
    setEditing(grade);
    setForm({
      stage: grade.stage,
      title_ar: grade.title_ar,
      title_en: grade.title_en,
      slug: grade.slug,
      sort_order: grade.sort_order,
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title_en || form.title_ar),
      };
      const result = editing
        ? await updateGrade(editing.id, payload)
        : await createGrade(payload);

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
      const result = await deleteGrade(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await load();
      } else {
        error(result.error);
      }
    });
  }

  function handleSeed() {
    startTransition(async () => {
      const result = await seedLibyanGrades();
      if (result.success) {
        success(result.message ?? "تمت التعبئة");
        await load();
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
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm font-semibold">الصفوف الدراسية</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            إدارة الصفوف
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ابتدائي · إعدادي · ثانوي — مع تعبئة المنهج الليبي الافتراضي
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleSeed} loading={pending}>
            <Sparkles className="h-4 w-4 text-amber-500" />
            تعبئة المنهج الليبي الافتراضي
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            صف جديد
          </Button>
        </div>
      </header>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          title="لا توجد صفوف دراسية"
          description='اضغط "تعبئة المنهج الليبي الافتراضي" لإضافة الصفوف 1–12 تلقائياً'
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>العنوان (عربي)</th>
                <th>العنوان (إنجليزي)</th>
                <th>المرحلة</th>
                <th>المعرّف</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold text-slate-500">
                    {item.sort_order}
                  </td>
                  <td className="font-medium">{item.title_ar}</td>
                  <td dir="ltr" className="text-slate-500">
                    {item.title_en}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {STAGE_LABELS[item.stage]}
                    </span>
                  </td>
                  <td>
                    <code
                      dir="ltr"
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {item.slug}
                    </code>
                  </td>
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
        title={editing ? "تعديل الصف" : "إضافة صف جديد"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="المرحلة"
            name="stage"
            required
            value={form.stage}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                stage: e.target.value as GradeStage,
              }))
            }
          >
            <option value="primary">{STAGE_LABELS.primary}</option>
            <option value="preparatory">{STAGE_LABELS.preparatory}</option>
            <option value="secondary">{STAGE_LABELS.secondary}</option>
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
            value={form.title_en}
            dir="ltr"
            onChange={(e) => {
              const title_en = e.target.value;
              setForm((f) => ({
                ...f,
                title_en,
                slug: f.slug || slugify(title_en),
              }));
            }}
          />
          <Input
            label="المعرّف (slug)"
            name="slug"
            value={form.slug}
            dir="ltr"
            onChange={(e) =>
              setForm((f) => ({ ...f, slug: e.target.value }))
            }
            placeholder="primary-1"
          />
          <Input
            label="ترتيب العرض"
            name="sort_order"
            type="number"
            required
            value={form.sort_order}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                sort_order: Number(e.target.value),
              }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "حفظ التعديلات" : "إضافة الصف"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف الصف"
        message="سيتم حذف الصف وجميع المذكرات المرتبطة به. هل أنت متأكد؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
