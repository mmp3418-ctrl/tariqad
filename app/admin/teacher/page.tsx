import Link from "next/link";
import { BookMarked, Calculator, CirclePlay, HelpCircle, School } from "lucide-react";

const CARDS = [
  { href: "/admin/teacher/tutorials", title: "شروحات المعلمين", desc: "فيديوهات يوتيوب مع غلاف اختياري", icon: CirclePlay },
  { href: "/admin/teacher/references", title: "مرجع المعلمين", desc: "ملفات PDF مرجعية للمعلمين", icon: BookMarked },
  { href: "/admin/teacher/questions", title: "بنك الأسئلة", desc: "أسئلة اختيار من متعدد مع الإجابة الصحيحة", icon: HelpCircle },
  { href: "/admin/teacher/tools", title: "الأدوات", desc: "عرض/إخفاء جدول الحصص العام وآلة حساب الدرجات", icon: Calculator },
] as const;

export default function TeacherSpacePage() {
  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-300/90">
          <School className="h-5 w-5" />
          <span className="text-sm font-semibold">مساحة المعلم</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">إدارة مساحة المعلم</h1>
        <p className="mt-2 text-sm text-slate-400">الشروحات، المراجع، بنك الأسئلة، وأدوات المعلم من مكان واحد.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} prefetch className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-xl shadow-black/30 transition hover:border-teal-500/40">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300"><Icon className="h-6 w-6" /></span>
              <span>
                <span className="block text-lg font-bold text-white">{card.title}</span>
                <span className="mt-1 block text-sm text-slate-400">{card.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
