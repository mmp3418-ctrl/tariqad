import Link from "next/link";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  Settings,
  Shield,
  CirclePlay,
  School,
} from "lucide-react";

const CARDS = [
  {
    href: "/admin/home",
    title: "محتوى الصفحة الرئيسية",
    desc: "العنوان، النص الفرعي، زر CTA، ونبذة عن المنصة",
    icon: Home,
  },
  {
    href: "/admin/books",
    title: "إدارة الكتب",
    desc: "كتالوج الكتب مع الغلاف والتحميل والسعر",
    icon: BookOpen,
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
    title: "إعدادات الموقع والتواصل",
    desc: "البريد، الموقع، واتساب، ووسائل التواصل",
    icon: Settings,
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 text-slate-100" dir="rtl">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-300/90">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-semibold">لوحة التحكم</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          مرحباً بك في منصة طارق
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          أدِر المحتوى الأكاديمي والمواد والكتب وإعدادات الموقع من مكان واحد.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              prefetch
              className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-xl shadow-black/30 transition hover:border-teal-500/40 hover:shadow-teal-950/30"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300 transition group-hover:bg-teal-500/20">
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-lg font-bold text-white">
                  {card.title}
                </span>
                <span className="mt-1 block text-sm text-slate-400">
                  {card.desc}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}