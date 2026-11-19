"use client";

import { useEffect, useState, useTransition } from "react";
import { Calculator, CalendarDays } from "lucide-react";
import {
  getTeacherSpaceSettings,
  setGradeCalculatorActive,
} from "@/app/admin/teacher-space/actions";
import {
  getSiteTimetableStatus,
  setSiteTimetableActive,
} from "@/app/admin/teacher/tools/actions";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

export function ToolsPanel() {
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [calculatorActive, setCalculatorActive] = useState(true);
  const [timetableActive, setTimetableActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [settings, status] = await Promise.all([
          getTeacherSpaceSettings(),
          getSiteTimetableStatus(),
        ]);
        if (cancelled) return;
        if (settings.success && settings.data) {
          setCalculatorActive(settings.data.grade_calculator_active);
        } else if (!settings.success) {
          error(settings.error);
        }
        if (status.success && status.data) {
          setTimetableActive(status.data.is_active);
        } else if (!status.success) {
          error(status.error);
        }
      } catch (err) {
        console.error("[tools-panel] load:", err);
        if (!cancelled) error("تعذّر تحميل الإعدادات حالياً، يرجى المحاولة لاحقاً");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [error]);

  function handleTimetableToggle(value: boolean) {
    const previous = timetableActive;
    setTimetableActive(value);
    startTransition(async () => {
      try {
        const result = await setSiteTimetableActive(value);
        if (result.success) {
          if (result.data) setTimetableActive(result.data.is_active);
          success(result.message ?? "تم التحديث");
        } else {
          setTimetableActive(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[tools-panel] timetable toggle:", err);
        setTimetableActive(previous);
        error("تعذّر تحديث إعداد الجدول، يرجى المحاولة لاحقاً");
      }
    });
  }

  function handleCalculatorToggle(value: boolean) {
    const previous = calculatorActive;
    setCalculatorActive(value);
    startTransition(async () => {
      try {
        const result = await setGradeCalculatorActive(value);
        if (result.success) {
          if (result.data) setCalculatorActive(result.data.grade_calculator_active);
          success(result.message ?? "تم التحديث");
        } else {
          setCalculatorActive(previous);
          error(result.error);
        }
      } catch (err) {
        console.error("[tools-panel] calculator toggle:", err);
        setCalculatorActive(previous);
        error("تعذّر تحديث آلة حساب الدرجات، يرجى المحاولة لاحقاً");
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
    <section className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 shadow-2xl shadow-black/40">
      <div>
        <div className="mb-1 flex items-center gap-2 text-teal-300/90">
          <CalendarDays className="h-5 w-5" />
          <span className="text-sm font-semibold">أدوات المنصة</span>
        </div>
        <p className="text-sm text-slate-400">
          تحكم في ظهور جدول الحصص العام وآلة حساب الدرجات للزوار.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">عرض جدول الحصص العام في المنصة</p>
          <p className="mt-1 text-xs text-slate-500">
            {timetableActive ? "ظاهر للزوار" : "مخفي عن الزوار"}
          </p>
        </div>
        <Switch
          checked={timetableActive}
          onChange={handleTimetableToggle}
          label={timetableActive ? "عرض" : "إخفاء"}
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Calculator className="mt-0.5 h-5 w-5 text-teal-300" />
          <div>
            <p className="font-semibold text-white">آلة حساب الدرجات</p>
            <p className="mt-1 text-xs text-slate-500">
              {calculatorActive ? "مفعّلة للمعلمين والزوار" : "مخفية عن الموقع"}
            </p>
          </div>
        </div>
        <Switch
          checked={calculatorActive}
          onChange={handleCalculatorToggle}
          label={calculatorActive ? "مفعّل" : "متوقف"}
          disabled={pending}
        />
      </div>
    </section>
  );
}
