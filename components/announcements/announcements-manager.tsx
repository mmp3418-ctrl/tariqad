"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import type { Announcement, AnnouncementKind } from "@/lib/types";
import {
  ANNOUNCEMENT_KIND_LABELS,
  ANNOUNCEMENT_KIND_STYLES,
} from "@/lib/constants";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
  updateAnnouncement,
} from "@/app/(dashboard)/announcements/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

const emptyForm = {
  message_ar: "",
  message_en: "",
  is_active: true,
  kind: "update" as AnnouncementKind,
};

export function AnnouncementsManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAnnouncements();
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

  function openEdit(item: Announcement) {
    setEditing(item);
    setForm({
      message_ar: item.message_ar,
      message_en: item.message_en,
      is_active: item.is_active,
      kind: item.kind || "update",
    });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateAnnouncement(editing.id, form)
        : await createAnnouncement(form);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        setEditing(null);
        await load();
      } else error(result.error);
    });
  }

  function handleToggle(item: Announcement) {
    startTransition(async () => {
      const result = await toggleAnnouncement(item.id, !item.is_active);
      if (result.success) {
        success(result.message ?? "تم التحديث");
        await load();
      } else error(result.error);
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteAnnouncement(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await load();
      } else error(result.error);
    });
  }

  const previewStyles = ANNOUNCEMENT_KIND_STYLES[form.kind];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <Megaphone className="h-5 w-5" />
            <span className="text-sm font-semibold">الإعلانات</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            إدارة الإعلانات
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            معاينة حية، أنواع الأولوية، وتفعيل فوري
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          إعلان جديد
        </Button>
      </header>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          title="لا توجد إعلانات بعد"
          description="أضف أول إعلان ليظهر للطلاب على المنصة"
        />
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const kind = item.kind || "update";
            const styles = ANNOUNCEMENT_KIND_STYLES[kind];
            return (
              <article
                key={item.id}
                className={`overflow-hidden rounded-2xl border bg-gradient-to-l ${styles.soft} shadow-sm`}
              >
                <div className={`h-1.5 w-full ${styles.bar}`} />
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${styles.badge}`}>
                        {ANNOUNCEMENT_KIND_LABELS[kind]}
                      </span>
                      <span
                        className={`badge ${item.is_active ? "badge-success" : "badge-muted"}`}
                      >
                        {item.is_active ? "نشط" : "متوقف"}
                      </span>
                    </div>
                    <p className="text-base font-semibold leading-relaxed text-slate-900">
                      {item.message_ar}
                    </p>
                    {item.message_en && (
                      <p className="text-sm text-slate-500" dir="ltr">
                        {item.message_en}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString("ar-LY")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Switch
                      checked={item.is_active}
                      onChange={() => handleToggle(item)}
                      disabled={pending}
                      label={item.is_active ? "مفعّل" : "متوقف"}
                    />
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
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل الإعلان" : "إضافة إعلان جديد"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={`overflow-hidden rounded-2xl border bg-gradient-to-l ${previewStyles.soft}`}
          >
            <div className={`h-1.5 ${previewStyles.bar}`} />
            <div className="space-y-2 p-4">
              <span className={`badge ${previewStyles.badge}`}>
                {ANNOUNCEMENT_KIND_LABELS[form.kind]}
              </span>
              <p className="text-sm font-semibold text-slate-800">
                {form.message_ar || "معاينة نص الإعلان ستظهر هنا..."}
              </p>
            </div>
          </div>

          <Select
            label="نوع الإعلان"
            name="kind"
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kind: e.target.value as AnnouncementKind,
              }))
            }
          >
            <option value="alert">تنبيه</option>
            <option value="update">تحديث</option>
            <option value="important">هام</option>
          </Select>
          <Textarea
            label="نص الإعلان (عربي)"
            name="message_ar"
            required
            value={form.message_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, message_ar: e.target.value }))
            }
          />
          <Textarea
            label="نص الإعلان (إنجليزي)"
            name="message_en"
            dir="ltr"
            value={form.message_en}
            onChange={(e) =>
              setForm((f) => ({ ...f, message_en: e.target.value }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-700"
            />
            تفعيل الإعلان فوراً
          </label>
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
        title="حذف الإعلان"
        message="هل أنت متأكد من حذف هذا الإعلان؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
