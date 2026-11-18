import Link from "next/link";
import { Settings, Shield } from "lucide-react";

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
          ابدأ بإدارة محتوى الموقع التعريفي وقنوات التواصل من صفحة الإعدادات.
        </p>
      </header>

      <Link
        href="/admin/settings"
        prefetch
        className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
          <Settings className="h-6 w-6" />
        </span>
        <span>
          <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">
            إعدادات الموقع والتواصل
          </span>
          <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
            الهواتف، واتساب، تيليجرام، وروابط وسائل التواصل مع إظهار/إخفاء لكل قناة
          </span>
        </span>
      </Link>
    </div>
  );
}
