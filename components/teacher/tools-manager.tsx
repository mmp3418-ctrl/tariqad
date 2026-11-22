"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Calculator, CalendarDays, Wrench } from "lucide-react";
import {
  getSiteTimetableStatus,
  getToolSettings,
  setSiteTimetableActive,
  setToolActive,
} from "@/app/admin/teacher/tools/actions";
import { arabicDbError } from "@/lib/ids";
import type { SiteTimetableStatus, SiteToolSetting } from "@/lib/types";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const TOOL_COPY: Record<string, { title: string; desc: string }> = {
  grade_calculator: {
    title: "آلة حساب الدرجات",
    desc: "إظهار أو إخفاء آلة حساب الدرجات داخل مساحة المعلم",
  },
};

export function ToolsManager() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SiteToolSetting[]>([]);
  const [timetableStatus, setTimetableStatus] =
    useState<SiteTimetableStatus | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tools, status] = await Promise.all([
        getToolSettings(),
        getSiteTimetableStatus(),
      ]);
      if (tools.success && tools.data) setItems(tools.data);
      else if (!tools.success) error(arabicDbError(tools.error));
      if (status.success && status.data) setTimetableStatus(status.data);
      else if (!status.success) error(arabicDbError(status.error));
    } catch (err) {
      console.error("[tools-manager] load:", err);
      error("تعذّر تحميل الإعدادات حالياً، يرجى المحاولة لاحقاً");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchBusy = pending || togglingKey !== null;

  const listHeader = (
    <header>
      <Link
        href="/admin/teacher"
        className="mb-1 flex items-center gap-2 text-sm font-semibold text-teal-300/90"
      >
        <Wrench className="h-5 w-5" />
        مساحة المعلم
      </Link>
      <h2 className="text-2xl font-extrabold text-white">
        أدوات مساحة المعلم
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        تحكم في ظهور جدول الحصص العام وآلة حساب الدرجات على المنصة
      </p>
    </header>
  );

  if (loading) {
    return (
      <div className="space-y-6 text-slate-100" dir="rtl">
        {listHeader}
        <ListSkeleton rows={2} />
      </div>
    );
  }

  const visible = items.length
    ? items
    : [
        {
          id: "grade_calculator",
          tool_key: "grade_calculator",
          is_active: true,
        },
      ];

  const timetableActive = timetableStatus?.is_active !== false;

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      {listHeader}

      <section className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl sm:p-6">
        <article className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold">عرض جدول الحصص العام في المنصة</p>
              <p className="mt-1 text-sm text-slate-400">
                قالب أسبوعي موحّد (7 أيام × 7 حصص) مع تحميل PDF للزوار
              </p>
            </div>
          </div>
          <Switch
            checked={timetableActive}
            disabled={switchBusy}
            label={timetableActive ? "عرض" : "إخفاء"}
            onChange={(value) => {
              const previous = timetableStatus;
              setTogglingKey("timetable");
              setTimetableStatus({
                id: previous?.id ?? "",
                status_key: previous?.status_key ?? "default",
                is_active: value,
                updated_at: previous?.updated_at,
              });
              startTransition(async () => {
                try {
                  const result = await setSiteTimetableActive(value);
                  if (result.success && result.data) {
                    setTimetableStatus(result.data);
                    success(result.message ?? "تم التحديث");
                  } else if (!result.success) {
                    setTimetableStatus(previous);
                    error(arabicDbError(result.error));
                  }
                } catch (err) {
                  console.error("[tools-manager] timetable toggle:", err);
                  setTimetableStatus(previous);
                  error("تعذّر تحديث إعداد الجدول، يرجى المحاولة لاحقاً");
                } finally {
                  setTogglingKey(null);
                }
              });
            }}
          />
        </article>

        {visible.map((item) => {
          const copy = TOOL_COPY[item.tool_key] ?? {
            title: "أداة مساحة المعلم",
            desc: "التحكم في ظهور هذه الأداة على الموقع",
          };
          return (
            <article
              key={item.tool_key}
              className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex size-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
                  <Calculator className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold">{copy.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{copy.desc}</p>
                </div>
              </div>
              <Switch
                checked={item.is_active}
                disabled={switchBusy}
                label={item.is_active ? "مفعّلة" : "متوقفة"}
                onChange={(value) => {
                  const previous = items;
                  setTogglingKey(item.tool_key);
                  setItems((prev) =>
                    prev.map((row) =>
                      row.tool_key === item.tool_key
                        ? { ...row, is_active: value }
                        : row
                    )
                  );
                  startTransition(async () => {
                    try {
                      const result = await setToolActive(item.tool_key, value);
                      if (result.success && result.data) {
                        const saved = result.data;
                        setItems((prev) =>
                          prev.some((row) => row.tool_key === item.tool_key)
                            ? prev.map((row) =>
                                row.tool_key === item.tool_key ? saved : row
                              )
                            : [...prev, saved]
                        );
                        success(result.message ?? "تم التحديث");
                      } else if (!result.success) {
                        setItems(previous);
                        error(arabicDbError(result.error));
                      }
                    } finally {
                      setTogglingKey(null);
                    }
                  });
                }}
              />
            </article>
          );
        })}
      </section>
    </div>
  );
}