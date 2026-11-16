"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import type { AdminRole, AdminUserPublic } from "@/lib/types";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
} from "@/app/(dashboard)/users/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { ConfirmDialog, EmptyState, PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/toast";

export function UsersManager() {
  const { success, error } = useToast();
  const [items, setItems] = useState<AdminUserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "helper" as AdminRole,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminUsers();
    if (result.success) setItems(result.data ?? []);
    else error(result.error);
    setLoading(false);
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createAdminUser(form);
      if (result.success) {
        success(result.message ?? "تم الحفظ");
        setModalOpen(false);
        setForm({ username: "", password: "", role: "helper" });
        await load();
      } else error(result.error);
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteAdminUser(deleteId);
      if (result.success) {
        success(result.message ?? "تم الحذف");
        setDeleteId(null);
        await load();
      } else error(result.error);
    });
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <Users className="h-5 w-5" />
            <span className="text-sm font-semibold">المشرفون والصلاحيات</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            إدارة حسابات المشرفين
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            أضف مساعدين بصلاحيات دخول منفصلة للوحة التحكم
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          مشرف جديد
        </Button>
      </header>

      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <EmptyState
          title="لا يوجد مستخدمون في قاعدة البيانات"
          description="يمكنك الدخول بالحساب الاحتياطي admin / tariq2026 حتى تضيف مشرفين"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((user) => (
            <article key={user.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">
                    {user.username}
                  </p>
                  <span
                    className={`badge mt-2 ${user.role === "admin" ? "badge-info" : "badge-muted"}`}
                  >
                    {user.role === "admin" ? "مشرف كامل" : "مساعد"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteId(user.id)}
                >
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                أُضيف في{" "}
                {new Date(user.created_at).toLocaleDateString("ar-LY")}
              </p>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="إضافة مشرف مساعد"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="اسم المستخدم"
            name="username"
            required
            value={form.username}
            onChange={(e) =>
              setForm((f) => ({ ...f, username: e.target.value }))
            }
          />
          <Input
            label="كلمة المرور"
            name="password"
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
          />
          <Select
            label="الصلاحية"
            name="role"
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({ ...f, role: e.target.value as AdminRole }))
            }
          >
            <option value="helper">مساعد</option>
            <option value="admin">مشرف كامل</option>
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
              إضافة
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="حذف المستخدم"
        message="هل أنت متأكد من حذف هذا الحساب؟"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={pending}
      />
    </div>
  );
}
