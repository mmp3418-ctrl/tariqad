import Link from "next/link";

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-slate-950"
    >
      <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
        404
      </p>
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
        الصفحة غير موجودة
      </h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        الرابط غير صحيح أو تم نقله. يمكنك العودة لتسجيل الدخول أو لوحة التحكم.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          تسجيل الدخول
        </Link>
        <Link
          href="/admin"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          لوحة التحكم
        </Link>
      </div>
    </main>
  );
}
