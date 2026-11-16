"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { GraduationCap, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Grade, GradeStage } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/constants";
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
  title_ar: "",
  stage: "primary" as GradeStage,
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
    if (result.success) setItems(result.data ?? []);
    else error(result.error);
    setLoading(false);
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(grade: Grade) {
    setEditing(grade);
    setForm({ title_ar: grade.title_ar, stage: grade.stage });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateGrade(editing.id, form)
        : await createGrade(form);
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
      const result = await deleteGrade(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await load();
      } else error(result.error);
    });
  }

  function handleSeed() {
    startTransition(async () => {
      const result = await seedLibyanGrades();
      if (result.success) {
        success(result.message ?? "تمت التعبئة");
        await load();
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm font-semibold">الصفوف الدراسية</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            إدارة الصفوف والمراحل
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            أدخل اسم الصف ثم اختر مرحلته — بدون تعقيدات تقنية
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          description="أضف صفاً أو عبّئ المنهج الليبي الافتراضي"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">
                    {item.title_ar}
                  </p>
                  <span className="badge badge-info mt-2">
                    {STAGE_LABELS[item.stage]}
                  </span>
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
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل الصف" : "إضافة صف دراسي"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            الخطوة 1: أدخل اسم الصف — الخطوة 2: اختر المرحلة التعليمية
          </div>
          <Input
            label="1. الصف الدراسي"
            name="title_ar"
            required
            placeholder="مثال: الأول الثانوي، الشهادة الإعدادية"
            value={form.title_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, title_ar: e.target.value }))
            }
          />
          <Select
            label="2. المرحلة التعليمية"
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
        title="حذف الصف"
        message="سيتم حذف الصف وجميع المذكرات/الشروحات المرتبطة به."
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
