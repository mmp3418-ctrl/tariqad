import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-teal-700">منصة طارق</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
          تسجيل الدخول
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          صفحة مؤقتة — سيتم بناء نظام المصادقة لاحقاً.
        </p>

        <form className="mt-6 space-y-4" action="#" method="post">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900">
              اسم المستخدم
            </span>
            <input
              name="username"
              type="text"
              placeholder="admin"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-900">
              كلمة المرور
            </span>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            />
          </label>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-700 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            دخول
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-teal-700 hover:underline">
            العودة للرئيسية
          </Link>
        </p>
      </div>
    </main>
  );
}
