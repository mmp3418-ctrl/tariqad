"use client";

import type { ReactNode } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import type { AcademicGrade, AcademicStage } from "@/lib/types";
import { Switch } from "@/components/ui/switch";

export const selectClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export type StageGradeProps = {
  stages: AcademicStage[];
  grades: AcademicGrade[];
};

export function stageName(stages: AcademicStage[], id: string | null) {
  return stages.find((s) => s.id === id)?.name ?? "—";
}

export function gradeName(grades: AcademicGrade[], id: string | null) {
  return grades.find((g) => g.id === id)?.name ?? "—";
}

export function SectionLoading() {
  return (
    <div className="flex min-h-[24vh] items-center justify-center text-slate-400">
      جاري التحميل...
    </div>
  );
}

export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-teal-600 px-4 text-sm font-semibold text-white shadow-lg shadow-teal-950/40 transition hover:from-teal-600 hover:to-teal-500"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

export function ListShell({
  children,
  empty,
  emptyText,
}: {
  children: ReactNode;
  empty: boolean;
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-black/40 sm:p-6">
      <div className="space-y-2">
        {empty ? (
          <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function RowActions({
  isActive,
  pending,
  onToggle,
  onEdit,
  onDelete,
}: {
  isActive: boolean;
  pending: boolean;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Switch
        checked={isActive}
        onChange={onToggle}
        label={isActive ? "تفعيل" : "إيقاف"}
        disabled={pending}
      />
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
        aria-label="تعديل"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10"
        aria-label="حذف"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function FormActions({
  pending,
  onCancel,
  disabled,
}: {
  pending: boolean;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="h-10 rounded-xl px-4 text-sm dark:text-slate-200 dark:hover:bg-slate-800"
      >
        إلغاء
      </button>
      <button
        type="submit"
        disabled={pending || disabled}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-70"
      >
        <Save className="h-4 w-4" />
        حفظ
      </button>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
      {message}
    </p>
  );
}

export function ActiveField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700">
      <span className="text-sm font-medium">
        {checked ? "تفعيل — ظاهر للطلاب" : "إيقاف — مخفي عن الزوار"}
      </span>
      <Switch
        checked={checked}
        onChange={onChange}
        label={checked ? "تفعيل" : "إيقاف"}
      />
    </div>
  );
}

export function DeleteDialog({
  open,
  title,
  message,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="إلغاء"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl px-4 text-sm text-slate-300 hover:bg-white/5"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-70"
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
}

export const rowClass =
  "flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-teal-500/30 sm:flex-row sm:items-center sm:justify-between";
