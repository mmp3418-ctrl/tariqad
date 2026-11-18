"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  toggleQuestionActive,
  updateQuestion,
} from "@/app/admin/teacher-space/actions";
import type { QuestionBankItem } from "@/lib/types";
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
  selectClass,
  stageName,
  type StageGradeProps,
} from "@/components/teacher-space/panel-ui";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const OPTION_LABELS = ["أ", "ب", "ج", "د"] as const;

const emptyForm = {
  question_text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  stage_id: "",
  grade_id: "",
  is_active: true,
};

function padOptions(options: string[]) {
  const next = [...options];
  while (next.length < 4) next.push("");
  return next.slice(0, 4);
}

export function QuestionsPanel({ stages, grades }: StageGradeProps) {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuestionBankItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getQuestions();
      if (result.success && result.data) setItems(result.data);
      else if (!result.success) error(result.error);
    } catch (err) {
      console.error("[questions-panel] load:", err);
      error("تعذر تحميل الأسئلة");
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
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: QuestionBankItem) {
    setEditing(item);
    setForm({
      question_text: item.question_text,
      options: padOptions(item.options ?? []),
      correct_index: Math.max(0, Math.min(3, item.correct_index ?? 0)),
      stage_id: item.stage_id ?? "",
      grade_id: item.grade_id ?? "",
      is_active: item.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function setOption(index: number, value: string) {
    setForm((f) => {
      const options = padOptions(f.options);
      options[index] = value;
      return { ...f, options };
    });
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.question_text.trim()) {
      setFormError("نص السؤال مطلوب");
      return;
    }
    if (!form.options[0]?.trim() || !form.options[1]?.trim()) {
      setFormError("الخيارات أ وب مطلوبان على الأقل");
      return;
    }
    if (!form.stage_id || !form.grade_id) {
      setFormError("اختر المرحلة والصف");
      return;
    }
    const payload = {
      question_text: form.question_text,
      options: padOptions(form.options),
      correct_index: form.correct_index,
      stage_id: form.stage_id,
      grade_id: form.grade_id,
      is_active: form.is_active,
    };
    startTransition(async () => {
      try {
        const result = editing
          ? await updateQuestion(editing.id, payload)
          : await createQuestion(payload);
        if (result.success && result.data) {
          setItems((prev) =>
            editing
              ? prev.map((x) => (x.id === editing.id ? result.data! : x))
              : [...prev, result.data!]
          );
          setModalOpen(false);
          success(result.message ?? "تم الحفظ");
        } else if (!result.success) {
          setFormError(result.error);
          error(result.error);
        }
      } catch (err) {
        console.error("[questions-panel] save:", err);
        error("حدث خطأ أثناء الحفظ");
      }
    });
  }

  function handleToggle(id: string, is_active: boolean) {
    const previous = items;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_active } : x)));
    startTransition(async () => {
      try {
        const result = await toggleQuestionActive(id, is_active);
        if (result.success && result.data) {
          setItems((prev) => prev.map((x) => (x.id === id ? result.data! : x)));
          success(result.message ?? "تم");
        } else if (!result.success) {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[questions-panel] toggle:", err);
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
        const result = await deleteQuestion(id);
        if (result.success) success(result.message ?? "تم الحذف");
        else {
          setItems(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[questions-panel] delete:", err);
        setItems(previous);
        error("تعذر الحذف");
      }
    });
  }

  if (loading) return <SectionLoading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddButton label="إضافة سؤال" onClick={openCreate} />
      </div>
      <ListShell empty={items.length === 0} emptyText="لا توجد أسئلة بعد">
        {items.map((item) => {
          const options = padOptions(item.options ?? []);
          const correct = Math.max(0, Math.min(3, item.correct_index ?? 0));
          return (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-teal-500/30 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{item.question_text}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {options
                    .map((opt, i) =>
                      opt.trim() ? `${OPTION_LABELS[i]}) ${opt}` : null
                    )
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-xs text-teal-400/90">
                  الإجابة الصحيحة: {OPTION_LABELS[correct]}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {stageName(stages, item.stage_id)} ·{" "}
                  {gradeName(grades, item.grade_id)}
                </p>
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
        title={editing ? "تعديل سؤال" : "إضافة سؤال"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">نص السؤال</span>
            <textarea
              value={form.question_text}
              onChange={(e) =>
                setForm((f) => ({ ...f, question_text: e.target.value }))
              }
              required
              rows={3}
              placeholder="اكتب السؤال"
              className={selectClass}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {OPTION_LABELS.map((label, index) => (
              <label key={label} className="block space-y-1.5">
                <span className="text-sm font-medium">
                  الخيار {label}
                  {index > 1 ? " (اختياري)" : ""}
                </span>
                <input
                  value={form.options[index] ?? ""}
                  onChange={(e) => setOption(index, e.target.value)}
                  required={index < 2}
                  className={selectClass}
                />
              </label>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">الإجابة الصحيحة</span>
            <select
              value={form.correct_index}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  correct_index: Number(e.target.value),
                }))
              }
              className={selectClass}
            >
              {OPTION_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <StageGradeFields
            stages={stages}
            grades={grades}
            stageId={form.stage_id}
            gradeId={form.grade_id}
            onStageChange={(id) => setForm((f) => ({ ...f, stage_id: id }))}
            onGradeChange={(id) => setForm((f) => ({ ...f, grade_id: id }))}
          />
          <ActiveField
            checked={form.is_active}
            onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
          <FormError message={formError} />
          <FormActions pending={pending} onCancel={() => setModalOpen(false)} />
        </form>
      </Modal>

      <DeleteDialog
        open={!!deleteId}
        title="حذف السؤال"
        message="هل أنت متأكد من حذف هذا السؤال؟"
        pending={pending}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
