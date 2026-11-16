import { Suspense } from "react";
import { BRAND_AR, BRAND_EN } from "@/lib/constants";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-hidden />
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/announcements";

  return <LoginForm nextPath={nextPath} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_transparent_55%),radial-gradient(ellipse_at_bottom,_#e2e8f0_0%,_transparent_50%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-teal-700/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-cyan-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700 text-2xl font-extrabold text-white shadow-lg shadow-teal-700/30">
            ط
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {BRAND_AR}
          </h1>
          <p className="mt-1 text-sm font-medium text-teal-800/70" dir="ltr">
            {BRAND_EN}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            لوحة تحكم المشرف — أدخل بيانات الدخول للمتابعة
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-xl shadow-slate-200/60 backdrop-blur">
          <Suspense fallback={<LoginFallback />}>
            <LoginContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
