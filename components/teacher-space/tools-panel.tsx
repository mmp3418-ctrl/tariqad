"use client";

import { useEffect, useState, useTransition } from "react";
import { Calculator } from "lucide-react";
import {
  getTeacherSpaceSettings,
  setGradeCalculatorActive,
} from "@/app/admin/teacher-space/actions";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

export function ToolsPanel() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getTeacherSpaceSettings();
        if (cancelled) return;
        if (result.success && result.data) {
          setActive(result.data.grade_calculator_active);
        } else if (!result.success) {
          error(result.error);
        }
      } catch (err) {
        console.error("[tools-panel] load:", err);
        if (!cancelled) error("تعذر تحميل الإعدادات");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [error]);

  function handleToggle(value: boolean) {
    const previous = active;
    setActive(value);
    startTransition(async () => {
      try {
        const result = await setGradeCalculatorActive(value);
        if (result.success) {
          if (result.data) setActive(result.data.grade_calculator_active);
          success(result.message ?? "تم التحديث");
        } else {
          setActive(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[tools-panel] toggle:", err);
        setActive(previous);
        error("تعذر تحديث آلة حساب الدرجات");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[24vh] items-center justify-center text-slate-400">
        جاري التحميل...
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 shadow-2xl shadow-black/40">
      <div className="mb-1 flex items-center gap-2 text-teal-300/90">
        <Calculator className="h-5 w-5" />
        <span className="text-sm font-semibold">أدوات المعلم</span>
      </div>
      <p className="text-sm text-slate-400">
        تحكم في إظهار آلة حساب الدرجات في مساحة المعلم على الموقع العام.
      </p>
      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">آلة حساب الدرجات</p>
          <p className="mt-1 text-xs text-slate-500">
            {active ? "مفعّلة للمعلمين والزوار" : "مخفية عن الموقع"}
          </p>
        </div>
        <Switch
          checked={active}
          onChange={handleToggle}
          label={active ? "مفعّل" : "متوقف"}
          disabled={pending}
        />
      </div>
    </section>
  );
}
