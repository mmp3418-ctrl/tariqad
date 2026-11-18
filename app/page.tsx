import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold text-teal-700">منصة طارق</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          لوحة التحكم
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          مشروع نظيف جاهز للبناء. ابدأ من صفحة الدخول لإدارة المنصة.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800"
      >
        الانتقال إلى تسجيل الدخول
      </Link>
    </main>
  );
}
