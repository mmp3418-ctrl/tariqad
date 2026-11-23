import Link from "next/link";
import {
  CirclePlay,
  FileText,
  GraduationCap,
  Home,
  Link2,
  Settings,
  Shield,
  School,
  CircleHelp,
  Library,
  Wrench,
} from "lucide-react";
import { getDashboardStats } from "./dashboard-stats";

const CARDS = [
  {
    href: "/admin/home",
    title: "محتوى الصفحة الرئيسية",
    desc: "العنوان، النص الفرعي، زر CTA، ونبذة عن المنصة",
    icon: Home,
  },
  {
    href: "/admin/academic",
    title: "الهيكل الأكاديمي",
    desc: "المراحل والصفوف والوحدات الدراسية",
    icon: GraduationCap,
  },
  {
    href: "/admin/materials",
    title: "المواد التعليمية",
    desc: "ملفات PDF: كتب وملازم وأوراق عمل",
    icon: FileText,
  },
  {
    href: "/admin/playlists",
    title: "قوائم الفيديو",
    desc: "شروحات يوتيوب مرتبطة بالمنهج",
    icon: CirclePlay,
  },
  {
    href: "/admin/teacher",
    title: "مساحة المعلم",
    desc: "الجداول، الشروحات، المراجع، بنك الأسئلة، وآلة الدرجات",
    icon: School,
  },
  {
    href: "/admin/settings",
    title: "التواصل والقنوات",
    desc: "البريد، الموقع، واتساب، ووسائل التواصل",
    icon: Settings,
  },
] as const;

function formatCount(value: number): string {
  return new Intl.NumberFormat("ar-SA").format(value);
}

type KpiItem = {
  label: string;
  value: number;
  hint: string;
  icon: typeof CirclePlay;
};

function KpiCard({ label, value, hint, icon: Icon }: KpiItem) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-5 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-end">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-white">
            {formatCount(value)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function ToolStatusPill({
  label,
  active,
}: {
  label: string;
  active: boolean | null;
}) {
  if (active === null) return null;
  const on = active;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
        on
          ? "border-teal-500/30 bg-teal-500/10 text-teal-200"
          : "border-slate-600/50 bg-slate-800/80 text-slate-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${on ? "bg-teal-400" : "bg-slate-500"}`}
        aria-hidden
      />
      {label}: {on ? "مفعّل" : "متوقف"}
    </span>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const kpis: KpiItem[] = [
    {
      label: "الشروحات",
      value: stats.tutorials,
      hint: "فيديوهات مساحة المعلم",
      icon: CirclePlay,
    },
    {
      label: "المراجع",
      value: stats.references,
      hint: "ملفات ومراجع معلّمة",
      icon: Library,
    },
    {
      label: "بنك الأسئلة",
      value: stats.questions,
      hint: "أسئلة مقترحة للطلاب",
      icon: CircleHelp,
    },
    {
      label: "قنوات التواصل",
      value: stats.activeSocialChannels,
      hint: "روابط نشطة على الموقع",
      icon: Link2,
    },
  ];

  const showToolsStrip =
    stats.totalTools > 0 || stats.timetableActive !== null;

  return (
    <div className="space-y-8 text-slate-100" dir="rtl">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-300/90">
          <Shield className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-sm font-semibold">لوحة التحكم</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          مرحباً بك في منصة طارق
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          نظرة سريعة على المحتوى والقنوات، ثم انتقل مباشرةً إلى ما تريد
          إدارته.
        </p>
      </header>

      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="mb-4 text-sm font-semibold text-slate-300">
          ملخص المنصة
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        {showToolsStrip ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-slate-900/40 px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Wrench className="h-3.5 w-3.5 text-teal-400/80" aria-hidden />
              حالة الأدوات
            </span>
            {stats.totalTools > 0 ? (
              <span className="text-xs text-slate-500">
                {formatCount(stats.activeTools)} من{" "}
                {formatCount(stats.totalTools)} أداة مفعّلة
              </span>
            ) : null}
            <ToolStatusPill label="الجدول الدراسي" active={stats.timetableActive} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="actions-heading">
        <h2
          id="actions-heading"
          className="mb-4 text-sm font-semibold text-slate-300"
        >
          إجراءات سريعة
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                prefetch
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-xl shadow-black/30 transition duration-200 hover:border-teal-500/40 hover:shadow-teal-950/30"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300 transition group-hover:bg-teal-500/20">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-white">
                    {card.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-400">
                    {card.desc}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}