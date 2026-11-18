import Link from "next/link";
import { BookOpen, Home, Settings, Shield } from "lucide-react";

const CARDS = [
  {
    href: "/admin/home",
    title: "محتوى الصفحة الرئيسية",
    desc: "العنوان الرئيسي، النص الفرعي، زر CTA، ونبذة عن المنصة",
    icon: Home,
  },
  {
    href: "/admin/books",
    title: "إدارة الكتب",
    desc: "إضافة وتعديل وحذف الكتب مع روابط الغلاف والتحميل والسعر",
    icon: BookOpen,
  },
  {
    href: "/admin/settings",
    title: "إعدادات الموقع والتواصل",
    desc: "البريد، الموقع، واتساب، تيليجرام، وقنوات التواصل",
    icon: Settings,
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <div className="mb-1 flex items-center gap-2 text-teal-700 dark:text-teal-300">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-semibold">لوحة التحكم</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          مرحباً بك في منصة طارق
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          أدِر محتوى الصفحة الرئيسية والكتب وإعدادات التواصل من هنا.
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
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">
                  {card.title}
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
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