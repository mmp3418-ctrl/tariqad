"use client";

import { useEffect, useState } from "react";
import {
  BookMarked,
  Calculator,
  CirclePlay,
  HelpCircle,
  School,
} from "lucide-react";
import { getAcademicTree } from "@/app/admin/academic/actions";
import { QuestionsPanel } from "@/components/teacher-space/questions-panel";
import { ReferencesPanel } from "@/components/teacher-space/references-panel";
import { ToolsPanel } from "@/components/teacher-space/tools-panel";
import { TutorialsPanel } from "@/components/teacher-space/tutorials-panel";
import type { AcademicGrade, AcademicStage } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

type TabId = "tutorials" | "references" | "questions" | "calculator";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof School;
}[] = [
  { id: "tutorials", label: "الشروحات", icon: CirclePlay },
  { id: "references", label: "المراجع", icon: BookMarked },
  { id: "questions", label: "بنك الأسئلة", icon: HelpCircle },
  { id: "calculator", label: "آلة الدرجات", icon: Calculator },
];

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  tutorials: "شروحات فيديو يوتيوب مع غلاف اختياري",
  references: "مراجع وملفات PDF للمعلمين",
  questions: "بنك أسئلة اختيار من متعدد",
  calculator: "تفعيل أو إيقاف آلة حساب الدرجات",
};

export function TeacherSpaceManager() {
  const { error } = useToast();
  const [tab, setTab] = useState<TabId>("tutorials");
  const [stages, setStages] = useState<AcademicStage[]>([]);
  const [grades, setGrades] = useState<AcademicGrade[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTreeLoading(true);
      try {
        const tree = await getAcademicTree();
        if (cancelled) return;
        if (tree.success && tree.data) {
          setStages(tree.data.stages);
          setGrades(tree.data.grades);
        } else if (!tree.success) {
          error(tree.error);
        }
      } catch (err) {
        console.error("[teacher-space] academic tree:", err);
        if (!cancelled) error("تعذر تحميل الهيكل الأكاديمي");
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [error]);

  if (treeLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        جاري تحميل مساحة المعلم...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-300/90">
          <School className="h-5 w-5" />
          <span className="text-sm font-semibold">محتوى المعلمين</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white">مساحة المعلم</h2>
        <p className="mt-1 text-sm text-slate-400">
          الشروحات، المراجع، بنك الأسئلة، وإعداد آلة الدرجات
        </p>
      </header>

      <nav
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="أقسام مساحة المعلم"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                selected
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-950/40"
                  : "border border-white/10 bg-white/[0.03] text-slate-300 hover:border-teal-500/30"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <p className="text-xs text-slate-500">{TAB_DESCRIPTIONS[tab]}</p>

      {tab === "tutorials" ? (
        <TutorialsPanel stages={stages} grades={grades} />
      ) : null}
      {tab === "references" ? (
        <ReferencesPanel stages={stages} grades={grades} />
      ) : null}
      {tab === "questions" ? (
        <QuestionsPanel stages={stages} grades={grades} />
      ) : null}
      {tab === "calculator" ? <ToolsPanel /> : null}
    </div>
  );
}
