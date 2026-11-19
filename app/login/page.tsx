import { PlatformLogo } from "@/components/brand/platform-logo";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,148,136,0.22),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(15,23,42,0.12),_transparent_45%),linear-gradient(160deg,#ecfeff_0%,#f8fafc_45%,#e2e8f0_100%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(45,212,191,0.18),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(15,118,110,0.2),_transparent_45%),linear-gradient(160deg,#020617_0%,#0f172a_55%,#022c26_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/15"
      />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/80 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <PlatformLogo priority className="h-14 w-auto object-contain" />
          </div>
          <p className="mt-4 text-sm font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            Tariq Hub
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            منصة طارق
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            سجّل الدخول للوصول إلى لوحة التحكم
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
