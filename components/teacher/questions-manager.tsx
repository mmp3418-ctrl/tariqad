"use client";
import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { HelpCircle, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import { createQuestion, deleteQuestion, getQuestions, toggleQuestionActive, updateQuestion } from "@/app/admin/teacher/questions/actions";
import type { AcademicGrade, AcademicStage, QuestionBankItem } from "@/lib/types";
import { StageGradeFields } from "@/components/teacher-space/stage-grade-fields";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
const field = "w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-600";
const LABELS = ["أ", "ب", "ج", "د"];
const empty = { question_text: "", options: ["", "", "", ""], correct_index: 0, stage_id: "", grade_id: "", is_active: true };
export function QuestionsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuestionBankItem | null>(null);
  const [form, setForm] = useState(empty);
  const [formError, setFormError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [tree, list] = await Promise.all([getAcademicTree(), getQuestions()]);
    if (tree.success && tree.data) { setStages(tree.data.stages); setGrades(tree.data.grades); } else if (!tree.success) error(tree.error);
    if (list.success && list.data) setItems(list.data); else if (!list.success) error(list.error);
    setLoading(false);
  }, [error]);
  useEffect(() => { void load(); }, [load]);
  function save(e: FormEvent) {
    e.preventDefault();
    const filled = form.options.map((item) => item.trim());
    while (filled.length && !filled[filled.length - 1]) filled.pop();
    if (!form.question_text.trim()) return setFormError("نص السؤال مطلوب");
    if (filled.length < 2 || filled.some((item) => !item)) return setFormError("أدخل خيارين على الأقل دون فراغ في الوسط");
    if (form.correct_index >= filled.length || !form.stage_id || !form.grade_id) return setFormError("حدد الإجابة والمرحلة والصف");
    startTransition(async () => {
      const result = editing ? await updateQuestion(editing.id, { ...form, options: filled }) : await createQuestion({ ...form, options: filled });
      if (result.success && result.data) { setItems((prev) => editing ? prev.map((item) => item.id === editing.id ? result.data! : item) : [...prev, result.data!]); setOpen(false); success(result.message ?? "تم الحفظ"); }
      else if (!result.success) { setFormError(result.error); error(result.error); }
    });
  }
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center text-slate-400">جاري تحميل بنك الأسئلة...</div>;
  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/admin/teacher" className="mb-1 flex items-center gap-2 text-sm font-semibold text-teal-300/90"><HelpCircle className="h-5 w-5" />مساحة المعلم</Link><h2 className="text-2xl font-extrabold text-white">بنك الأسئلة</h2><p className="mt-1 text-sm text-slate-400">أسئلة اختيار من متعدد مع الإجابة الصحيحة</p></div>
        <button type="button" onClick={() => { setEditing(null); setForm({ ...empty, options: ["", "", "", ""] }); setFormError(null); setOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />إضافة سؤال</button>
      </header>
      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl sm:p-6">
        {items.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">لا توجد أسئلة بعد</div> : items.map((item) => (
          <article key={item.id} className="mb-2 flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-semibold">{item.question_text}</p><p className="mt-1 text-xs text-slate-500">{stages.find((s) => s.id === item.stage_id)?.name ?? "—"} · {grades.find((g) => g.id === item.grade_id)?.name ?? "—"} · الإجابة: {item.options[item.correct_index] ?? "—"}</p></div>
            <div className="flex items-center gap-2">
              <Switch checked={item.is_active} disabled={pending} label={item.is_active ? "مفعّل" : "متوقف"} onChange={(v) => { const prev = items; setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, is_active: v } : row)); startTransition(async () => { const result = await toggleQuestionActive(item.id, v); if (!result.success) { setItems(prev); error(result.error); } else if (result.data) setItems((rows) => rows.map((row) => row.id === item.id ? result.data! : row)); }); }} />
              <button type="button" aria-label="تعديل" onClick={() => { const options = [...item.options]; while (options.length < 4) options.push(""); setEditing(item); setForm({ question_text: item.question_text, options: options.slice(0, 4), correct_index: item.correct_index, stage_id: item.stage_id ?? "", grade_id: item.grade_id ?? "", is_active: item.is_active }); setOpen(true); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
              <button type="button" aria-label="حذف" onClick={() => setDeleteId(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "تعديل سؤال" : "إضافة سؤال"}>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1.5"><span className="text-sm font-medium">نص السؤال</span><textarea value={form.question_text} required rows={3} onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))} className={field} /></label>
          {LABELS.map((label, index) => <div key={label} className="flex items-center gap-2"><button type="button" onClick={() => setForm((f) => ({ ...f, correct_index: index }))} className={`h-10 w-10 rounded-xl border text-sm font-bold ${form.correct_index === index ? "border-teal-400 bg-teal-500/20 text-teal-200" : "border-white/10 text-slate-400"}`}>{label}</button><input value={form.options[index] ?? ""} required={index < 2} placeholder={`الخيار ${label}`} onChange={(e) => setForm((f) => { const options = [...f.options]; options[index] = e.target.value; return { ...f, options }; })} className={field} /></div>)}
          <p className="text-xs text-slate-500">اضغط الحرف لتحديد الإجابة الصحيحة.</p>
          <StageGradeFields stages={stages} grades={grades} stageId={form.stage_id} gradeId={form.grade_id} onStageChange={(id) => setForm((f) => ({ ...f, stage_id: id, grade_id: "" }))} onGradeChange={(id) => setForm((f) => ({ ...f, grade_id: id }))} />
          <div className="flex items-center justify-between rounded-xl border border-slate-700 px-3 py-3"><span className="text-sm">مفعّل على الموقع</span><Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} /></div>
          {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="h-10 px-4 text-sm">إلغاء</button><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white"><Save className="h-4 w-4" />حفظ</button></div>
        </form>
      </Modal>
      {deleteId ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl bg-slate-900 p-6"><h3 className="font-bold">حذف السؤال</h3><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDeleteId(null)} className="h-10 px-4">إلغاء</button><button type="button" onClick={() => { const id = deleteId; const prev = items; setDeleteId(null); setItems((rows) => rows.filter((row) => row.id !== id)); startTransition(async () => { const result = await deleteQuestion(id); if (result.success) success(result.message ?? "تم الحذف"); else { setItems(prev); error(result.error); } }); }} className="h-10 rounded-xl bg-rose-600 px-4 text-white">تأكيد الحذف</button></div></div></div> : null}
    </div>
  );
}
