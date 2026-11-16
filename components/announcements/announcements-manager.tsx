"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Megaphone, Plus, Power, Trash2 } from "lucide-react";
import type { Announcement } from "@/lib/types";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  toggleAnnouncement,
} from "@/app/(dashboard)/announcements/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

export function AnnouncementsManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    message_ar: "",
    message_en: "",
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAnnouncements();
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

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createAnnouncement(form);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        setForm({ message_ar: "", message_en: "", is_active: true });
        await load();
      } else {
        error(result.error);
      }
    });
  }

  function handleToggle(item: Announcement) {
    startTransition(async () => {
      const result = await toggleAnnouncement(item.id, !item.is_active);
      if (result.success) {
        success(result.message ?? "تم التحديث");
        await load();
      } else {
        error(result.error);
      }
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
      } else {
        error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
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
            أضف وعدّل الإعلانات الظاهرة على المنصة
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
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
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>الرسالة (عربي)</th>
                <th>الرسالة (إنجليزي)</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="max-w-xs">
                    <p className="line-clamp-2 font-medium">{item.message_ar}</p>
                  </td>
                  <td className="max-w-xs">
                    <p className="line-clamp-2 text-slate-500" dir="ltr">
                      {item.message_en || "—"}
                    </p>
                  </td>
                  <td>
                    <span
                      className={`badge ${item.is_active ? "badge-success" : "badge-muted"}`}
                    >
                      {item.is_active ? "نشط" : "متوقف"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {new Date(item.created_at).toLocaleDateString("ar-LY")}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggle(item)}
                        disabled={pending}
                        title={item.is_active ? "إيقاف" : "تفعيل"}
                      >
                        <Power
                          className={`h-4 w-4 ${item.is_active ? "text-emerald-600" : "text-slate-400"}`}
                        />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(item.id)}
                        disabled={pending}
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
        title="إضافة إعلان جديد"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Textarea
            label="نص الإعلان (عربي)"
            name="message_ar"
            required
            value={form.message_ar}
            onChange={(e) =>
              setForm((f) => ({ ...f, message_ar: e.target.value }))
            }
            placeholder="اكتب نص الإعلان بالعربية..."
          />
          <Textarea
            label="نص الإعلان (إنجليزي)"
            name="message_en"
            value={form.message_en}
            onChange={(e) =>
              setForm((f) => ({ ...f, message_en: e.target.value }))
            }
            placeholder="Announcement text in English..."
            dir="ltr"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            تفعيل الإعلان فوراً
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={pending}>
              حفظ الإعلان
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف الإعلان"
        message="هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء."
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
