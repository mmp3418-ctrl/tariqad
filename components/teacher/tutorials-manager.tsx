"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CirclePlay, ExternalLink, ImagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import { createTutorial, deleteTutorial, getTutorials, toggleTutorialActive, updateTutorial } from "@/app/admin/teacher/tutorials/actions";
import { isValidYoutubeUrl } from "@/lib/academic";
import { listLoadError } from "@/lib/list-load-error";
import { safeExternalHref } from "@/lib/social";
import { uploadPlaylistCover } from "@/lib/storage";
import type { AcademicGrade, AcademicStage, TeacherTutorial } from "@/lib/types";
import { StageGradeFields } from "@/components/teacher-space/stage-grade-fields";
import { EmptyListState } from "@/components/ui/empty-list-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Modal } from "@/components/ui/modal";
import { SearchField } from "@/components/ui/search-field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
const field = "w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-600";
const empty = { title: "", youtube_url: "", cover_image_url: "", stage_id: "", grade_id: "", is_active: true };
export function TutorialsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<TeacherTutorial[]>([]);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeacherTutorial | null>(null);
  const [form, setForm] = useState(empty);
  const [formError, setFormError] = useState<string | null>(null);
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.title.toLowerCase().includes(q));
  }, [items, search]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tree, list] = await Promise.all([getAcademicTree(), getTutorials()]);
      if (tree.success && tree.data) {
        setStages(tree.data.stages);
        setGrades(tree.data.grades);
      } else if (!tree.success) {
        console.error("[tutorials-manager] academic tree:", tree.error);
      }
      if (list.success && list.data) setItems(list.data);
      else if (!list.success) error(listLoadError(list.error));
    } catch (err) {
      console.error("[tutorials-manager] load:", err);
      error("تعذّر تحميل الشروحات، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  }, [error]);
  useEffect(() => { void load(); }, [load]);
  async function onCover(file: File | null) {
    if (!file) return; setUploading(true);
    const result = await uploadPlaylistCover(file); setUploading(false);
    if (result.success && result.data) { setForm((f) => ({ ...f, cover_image_url: result.data!.publicUrl })); success(result.message ?? "تم رفع الغلاف"); }
    else if (!result.success) { setFormError(result.error); error(result.error); }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setFormError("العنوان مطلوب");
    if (!isValidYoutubeUrl(form.youtube_url)) return setFormError("رابط يوتيوب غير صالح");
    if (!form.stage_id || !form.grade_id) return setFormError("اختر المرحلة والصف");
    startTransition(async () => {
      const result = editing ? await updateTutorial(editing.id, form) : await createTutorial(form);
      if (result.success && result.data) { setItems((prev) => editing ? prev.map((item) => item.id === editing.id ? result.data! : item) : [...prev, result.data!]); setOpen(false); success(result.message ?? "تم الحفظ"); }
      else if (!result.success) { setFormError(result.error); error(result.error); }
    });
  }
  const listHeader = (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><Link href="/admin/teacher" className="mb-1 flex items-center gap-2 text-sm font-semibold text-teal-300/90"><CirclePlay className="h-5 w-5" />مساحة المعلم</Link><h2 className="text-2xl font-extrabold text-white">شروحات المعلمين</h2><p className="mt-1 text-sm text-slate-400">رابط يوتيوب مع غلاف اختياري وربط المرحلة والصف</p></div>
      <button type="button" onClick={() => { setEditing(null); setForm(empty); setFormError(null); setOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />إضافة شرح</button>
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
          <EmptyListState message="لا توجد شروحات بعد" hint="اضغط «إضافة شرح» في الأعلى لنشر أول شرح يوتيوب" />
        ) : filteredItems.length === 0 ? (
          <EmptyListState message="لا توجد نتائج مطابقة" hint="جرّب كلمة بحث أخرى أو امسح حقل البحث" />
        ) : filteredItems.map((item) => {
          const href = safeExternalHref(item.youtube_url);
          return <article key={item.id} className="mb-2 flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3">{item.cover_image_url ? <img src={item.cover_image_url} alt="" className="size-14 rounded-lg object-cover" /> : <span className="inline-flex size-14 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300"><CirclePlay className="h-6 w-6" /></span>}<div><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{stages.find((s) => s.id === item.stage_id)?.name ?? "—"} · {grades.find((g) => g.id === item.grade_id)?.name ?? "—"}</p>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-teal-400"><ExternalLink className="h-3 w-3" /><span className="truncate">{item.youtube_url}</span></a> : null}</div></div><div className="flex items-center gap-2"><Switch checked={item.is_active} disabled={pending} label={item.is_active ? "مفعّل" : "متوقف"} onChange={(v) => { const prev = items; setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, is_active: v } : row)); startTransition(async () => { const result = await toggleTutorialActive(item.id, v); if (!result.success) { setItems(prev); error(result.error); } else if (result.data) setItems((rows) => rows.map((row) => row.id === item.id ? result.data! : row)); }); }} /><button type="button" aria-label="تعديل" onClick={() => { setEditing(item); setForm({ title: item.title, youtube_url: item.youtube_url, cover_image_url: item.cover_image_url ?? "", stage_id: item.stage_id ?? "", grade_id: item.grade_id ?? "", is_active: item.is_active }); setOpen(true); }} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><Pencil className="h-4 w-4" /></button><button type="button" aria-label="حذف" onClick={() => setDeleteId(item.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400"><Trash2 className="h-4 w-4" /></button></div></article>;
        })}
      </section>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "تعديل شرح" : "إضافة شرح"}>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1.5"><span className="text-sm font-medium">العنوان</span><input value={form.title} required onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={field} /></label>
          <label className="block space-y-1.5"><span className="text-sm font-medium">رابط يوتيوب</span><input value={form.youtube_url} required placeholder="https://www.youtube.com/watch?v=..." onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))} className={field} /></label>
          <StageGradeFields stages={stages} grades={grades} stageId={form.stage_id} gradeId={form.grade_id} onStageChange={(id) => setForm((f) => ({ ...f, stage_id: id, grade_id: "" }))} onGradeChange={(id) => setForm((f) => ({ ...f, grade_id: id }))} />
          <div className="space-y-2 rounded-xl border border-slate-700 p-3">
            <span className="text-sm font-medium">غلاف اختياري</span>
            {form.cover_image_url ? <div className="relative"><img src={form.cover_image_url} alt="" className="h-36 w-full rounded-xl object-cover" /><button type="button" onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))} className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs"><X className="h-3 w-3" />إزالة</button></div> : null}
            <div className="flex flex-col gap-2 sm:flex-row"><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-teal-500/40 px-3 text-sm text-teal-300"><ImagePlus className="h-4 w-4" />{uploading ? "جاري الرفع..." : "رفع صورة"}<input type="file" accept="image/*" className="sr-only" disabled={uploading || pending} onChange={(e) => { void onCover(e.target.files?.[0] ?? null); e.target.value = ""; }} /></label><input value={form.cover_image_url} placeholder="أو الصق رابط صورة" onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))} className={field} /></div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-700 px-3 py-3"><span className="text-sm">مفعّل على الموقع</span><Switch checked={form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} /></div>
          {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="h-10 px-4 text-sm">إلغاء</button><button type="submit" disabled={pending || uploading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />حفظ</button></div>
        </form>
      </Modal>
      {deleteId ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6"><h3 className="font-bold text-white">حذف الشرح</h3><p className="mt-2 text-sm text-slate-400">سيتم إزالة هذا الشرح من الموقع ولا يمكن التراجع عن الحذف.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setDeleteId(null)} className="h-10 px-4 text-slate-300">إلغاء</button><button type="button" disabled={pending} onClick={() => { const id = deleteId; const prev = items; setDeleteId(null); setItems((rows) => rows.filter((row) => row.id !== id)); startTransition(async () => { const result = await deleteTutorial(id); if (result.success) success(result.message ?? "تم الحذف"); else { setItems(prev); error(result.error); } }); }} className="h-10 rounded-xl bg-rose-600 px-4 text-white disabled:opacity-60">تأكيد الحذف</button></div></div></div> : null}
    </div>
  );
}