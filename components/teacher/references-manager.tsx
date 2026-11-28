"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { BookMarked, ExternalLink, Pencil, Plus, Save, Trash2, Upload } from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import { createReference, deleteReference, getReferences, toggleReferenceActive, updateReference } from "@/app/admin/teacher/references/actions";
import { listLoadError } from "@/lib/list-load-error";
import { uploadMaterialPdf } from "@/lib/storage";
import { safeExternalHref } from "@/lib/social";
import type { AcademicGrade, AcademicStage, TeacherReference } from "@/lib/types";
import { StageGradeFields } from "@/components/teacher-space/stage-grade-fields";
import { EmptyListState } from "@/components/ui/empty-list-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Modal } from "@/components/ui/modal";
import { SearchField } from "@/components/ui/search-field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
const field = "w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-600";
const empty = { title: "", description: "", file_url: "", stage_id: "", grade_id: "", is_active: true };
export function ReferencesManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<TeacherReference[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeacherReference | null>(null);
  const [form, setForm] = useState(empty);
  const [fileName, setFileName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [items, search]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tree, list] = await Promise.all([getAcademicTree(), getReferences()]);
      if (tree.success && tree.data) {
        setStages(tree.data.stages);
        setGrades(tree.data.grades);
      } else if (!tree.success) {
        console.error("[references-manager] academic tree:", tree.error);
      }
      if (list.success && list.data) setItems(list.data);
      else if (!list.success) error(listLoadError(list.error));
    } catch (err) {
      console.error("[references-manager] load:", err);
      error("تعذّر تحميل المراجع، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  }, [error]);
  useEffect(() => { void load(); }, [load]);
  async function onFile(file: File | null) {
    if (!file) return;
    setFormError(null);
    setUploading(true);
    try {
      const result = await uploadMaterialPdf(file);
      if (result.success && result.data) {
        setForm((f) => ({ ...f, file_url: result.data!.publicUrl }));
        setFileName(file.name);
        setFormError(null);
        success(result.message ?? "تم رفع ملف PDF");
      } else if (!result.success) {
        setFormError(result.error);
        error(result.error);
      }
    } catch (err) {
      console.error("[references-manager] upload:", err);
      const msg = "تعذّر رفع الملف حالياً، يرجى المحاولة لاحقاً.";
      setFormError(msg);
      error(msg);
    } finally {
      setUploading(false);
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.stage_id || !form.grade_id || !form.file_url.trim()) { setFormError("أكمل العنوان والملف والمرحلة والصف"); return; }
    startTransition(async () => {
      const result = editing ? await updateReference(editing.id, form) : await createReference(form);
      if (result.success && result.data) { setItems((prev) => editing ? prev.map((item) => item.id === editing.id ? result.data! : item) : [...prev, result.data!]); setOpen(false); success(result.message ?? "تم الحفظ"); }
      else if (!result.success) { setFormError(result.error); error(result.error); }
    });
  }
  const listHeader = (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Link href="/admin/teacher" className="mb-1 flex items-center gap-2 text-sm font-semibold text-teal-300/90"><BookMarked className="h-5 w-5" />مساحة المعلم</Link><h2 className="text-2xl font-extrabold text-white">مرجع المعلمين</h2><p className="mt-1 text-sm text-slate-400">ملفات PDF مرجعية مرتبطة بالمرحلة والصف</p></div>
      <button type="button" onClick={() => { setEditing(null); setForm(empty); setFileName(null); setFormError(null); setOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />إضافة مرجع</button>
    </header>
  );
  if (loading) {
    return (
      <div className="space-y-6 text-slate-100" dir="rtl">
        {listHeader}
        <ListSkeleton rows={4} />
      </div>
    );
  }
  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {listHeader}
      <SearchField value={search} onChange={setSearch} placeholder="بحث بالعنوان..." className="max-w-md" />
      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl sm:p-6">
        {items.length === 0 ? (
          <EmptyListState message="لا توجد مراجع بعد" hint="اضغط «إضافة مرجع» في الأعلى لرفع أول ملف PDF" />
        ) : filteredItems.length === 0 ? (
          <EmptyListState message="لا توجد نتائج مطابقة" hint="جرّب كلمة بحث أخرى أو امسح حقل البحث" />
        ) : filteredItems.map((item) => {
          const href = safeExternalHref(item.file_url);
          return <article key={item.id} className="mb-2 flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{stages.find((s) => s.id === item.stage_id)?.name ?? "—"} · {grades.find((g) => g.id === item.grade_id)?.name ?? "—"}{item.description ? ` · ${item.description}` : ""}</p>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-teal-400"><ExternalLink className="h-3 w-3" />فتح PDF</a> : null}</div><div className="flex items-center gap-2"><Switch checked={item.is_active} disabled={pending} label={item.is_active ? "مفعّل" : "متوقف"} onChange={(v) => { const prev = items; setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, is_active: v } : row)); startTransition(async () => { const result = await toggleReferenceActive(item.id, v); if (!result.success) { setItems(prev); error(result.error); } else if (result.data) setItems((rows) => rows.map((row) => row.id === item.id ? result.data! : row)); }); }} /><button type="button" aria-label="تعديل" onClick={() => { setEditing(item); setForm({ title: item.title, description: item.description ?? "", file_url: item.file_url, stage_id: item.stage_id ?? "", grade_id: item.grade_id ?? "", is_active: item.is_active }); setFileName("ملف محفوظ"); setOpen(true); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><Pencil className="h-4 w-4" /></button><button type="button" aria-label="حذف" onClick={() => setDeleteId(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400"><Trash2 className="h-4 w-4" /></button></div></article>;
        })}
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "تعديل مرجع" : "إضافة مرجع"}>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1.5"><span className="text-sm font-medium">العنوان</span><input value={form.title} required onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={field} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium">وصف مختصر (اختياري)</span><textarea value={form.description} rows={3} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={field} /></label>
          <StageGradeFields stages={stages} grades={grades} stageId={form.stage_id} gradeId={form.grade_id} onStageChange={(id) => setForm((f) => ({ ...f, stage_id: id, grade_id: "" }))} onGradeChange={(id) => setForm((f) => ({ ...f, grade_id: id }))} />
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-teal-500/40 bg-teal-500/5 px-4 py-6"><Upload className="h-6 w-6 text-teal-400" /><span className="text-sm">{uploading ? "جاري الرفع..." : "رفع ملف PDF"}</span>{fileName ? <span className="text-xs text-teal-300">{fileName}</span> : null}<input type="file" accept="application/pdf,.pdf" className="hidden" disabled={uploading || pending} onChange={(e) => { void onFile(e.target.files?.[0] ?? null); e.target.value = ""; }} /></label>
          <div className="flex items-center justify-between rounded-xl border border-slate-700 px-3 py-3"><span className="text-sm">مفعّل على الموقع</span><Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} /></div>
          {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="h-10 px-4 text-sm">إلغاء</button><button type="submit" disabled={pending || uploading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />حفظ</button></div>
        </form>
      </Modal>
      {deleteId ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6"><h3 className="font-bold text-white">حذف المرجع</h3><p className="mt-2 text-sm text-slate-400">سيتم حذف ملف المرجع من القائمة ولن يظهر للزوّار.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDeleteId(null)} className="h-10 px-4 text-slate-300">إلغاء</button><button type="button" disabled={pending} onClick={() => { const id = deleteId; const prev = items; setDeleteId(null); setItems((rows) => rows.filter((row) => row.id !== id)); startTransition(async () => { const result = await deleteReference(id); if (result.success) success(result.message ?? "تم الحذف"); else { setItems(prev); error(result.error); } }); }} className="h-10 rounded-xl bg-rose-600 px-4 text-white disabled:opacity-60">تأكيد الحذف</button></div></div></div> : null}
    </div>
  );
}