"use client";

import { useMemo } from "react";
import type { AcademicGrade, AcademicStage } from "@/lib/types";

const selectClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export function StageGradeFields({
  stages,
  grades,
  stageId,
  gradeId,
  onStageChange,
  onGradeChange,
  required = true,
}: {
  stages: AcademicStage[];
  grades: AcademicGrade[];
  stageId: string;
  gradeId: string;
  onStageChange: (id: string) => void;
  onGradeChange: (id: string) => void;
  required?: boolean;
}) {
  const activeStages = useMemo(
    () => stages.filter((s) => s.is_active !== false),
    [stages]
  );
  const filteredGrades = useMemo(
    () =>
      grades.filter(
        (g) => g.stage_id === stageId && g.is_active !== false
      ),
    [grades, stageId]
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">المرحلة</span>
        <select
          value={stageId}
          required={required}
          onChange={(e) => {
            onStageChange(e.target.value);
            onGradeChange("");
          }}
          className={selectClass}
        >
          <option value="">اختر المرحلة</option>
          {activeStages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">الصف</span>
        <select
          value={gradeId}
          required={required}
          disabled={!stageId}
          onChange={(e) => onGradeChange(e.target.value)}
          className={`${selectClass} disabled:opacity-40`}
        >
          <option value="">اختر الصف</option>
          {filteredGrades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
