"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import { TimetablesPanel } from "@/components/teacher-space/timetables-panel";
import type { AcademicGrade, AcademicStage } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

/**
 * Dedicated Interactive Timetable Creator page under مساحة المعلم.
 * Reuses the shared TimetablesPanel (grid + PDF export + is_active).
 */
export function TimetablesManager() {
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tree = await getAcademicTree();
      if (tree.success && tree.data) {
        setStages(tree.data.stages);
        setGrades(tree.data.grades);
      } else if (!tree.success) {
        error(tree.error);
      }
    } catch (err) {
      console.error("[timetables-manager] load:", err);
      error("تعذر تحميل الهيكل الأكاديمي");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400" dir="rtl">
        جاري تحميل صانع جداول الحصص...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header>
        <Link
          href="/admin/teacher"
          className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-teal-300/90"
        >
          <CalendarDays className="h-5 w-5" />
          مساحة المعلم
        </Link>
        <h1 className="text-2xl font-extrabold text-white">
          صانع جداول الحصص التفاعلي
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          اختر المرحلة والصف، ابنِ شبكة الأيام والحصص، صدّر PDF احترافياً، ثم فعّل الجدول
          ليظهر للطلاب على المنصة.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
        <TimetablesPanel stages={stages} grades={grades} />
      </section>
    </div>
  );
}
