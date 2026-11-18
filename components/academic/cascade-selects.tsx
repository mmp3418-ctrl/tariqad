"use client";

import { useMemo } from "react";
import type { AcademicGrade, AcademicStage, AcademicUnit } from "@/lib/types";

const selectClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:border-teal-500/60 dark:focus:ring-teal-500/20";

export function AcademicCascadeSelects({
  stages,
  grades,
  units,
  stageId,
  gradeId,
  unitId,
  onStageChange,
  onGradeChange,
  onUnitChange,
  required = true,
}: {
  stages: AcademicStage[];
  grades: AcademicGrade[];
  units: AcademicUnit[];
  stageId: string;
  gradeId: string;
  unitId: string;
  onStageChange: (id: string) => void;
  onGradeChange: (id: string) => void;
  onUnitChange: (id: string) => void;
  required?: boolean;
}) {
  const activeStages = useMemo(
    () => stages.filter((s) => s.is_active),
    [stages]
  );
  const filteredGrades = useMemo(
    () =>
      grades.filter((g) => g.stage_id === stageId && g.is_active),
    [grades, stageId]
  );
  const filteredUnits = useMemo(
    () =>
      units.filter((u) => u.grade_id === gradeId && u.is_active),
    [units, gradeId]
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-slate-600 dark:text-teal-200/80">
          المرحلة
        </span>
        <select
          value={stageId}
          required={required}
          onChange={(e) => {
            onStageChange(e.target.value);
            onGradeChange("");
            onUnitChange("");
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
        <span className="text-xs font-semibold tracking-wide text-slate-600 dark:text-teal-200/80">
          الصف
        </span>
        <select
          value={gradeId}
          required={required}
          disabled={!stageId}
          onChange={(e) => {
            onGradeChange(e.target.value);
            onUnitChange("");
          }}
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

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold tracking-wide text-slate-600 dark:text-teal-200/80">
          الوحدة
        </span>
        <select
          value={unitId}
          required={required}
          disabled={!gradeId}
          onChange={(e) => onUnitChange(e.target.value)}
          className={`${selectClass} disabled:opacity-40`}
        >
          <option value="">اختر الوحدة</option>
          {filteredUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function resolveAcademicLabels(
  stages: AcademicStage[],
  grades: AcademicGrade[],
  units: AcademicUnit[],
  stageId: string | null,
  gradeId: string | null,
  unitId: string | null
) {
  return {
    stage: stages.find((s) => s.id === stageId)?.name ?? "—",
    grade: grades.find((g) => g.id === gradeId)?.name ?? "—",
    unit: units.find((u) => u.id === unitId)?.name ?? "—",
  };
}