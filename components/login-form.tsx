"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import {
  createSession,
  persistSession,
  readSession,
  validateCredentials,
} from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (session) router.replace("/admin");
  }, [router]);

  useEffect(() => {
    if (!errorModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [errorModalOpen]);

  function showError(message: string) {
    setError(message);
    setErrorModalOpen(true);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      showError("يرجى إدخال اسم المستخدم وكلمة المرور.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 450));

    if (!validateCredentials(username, password)) {
      setLoading(false);
      showError("بيانات الدخول غير صحيحة. تحقق من اسم المستخدم أو كلمة المرور.");
      return;
    }

    persistSession(createSession(username.trim()));
    router.replace("/admin");
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            اسم المستخدم
          </span>
          <div className="relative">
            <User
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              disabled={loading}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            كلمة المرور
          </span>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-10 pl-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={loading}
              className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </label>

        {error && !errorModalOpen ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-bold text-white shadow-lg shadow-teal-700/25 transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          {loading ? "جاري التحقق..." : "تسجيل الدخول"}
        </button>
      </form>

      {errorModalOpen && error ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="إغلاق"
            onClick={() => setErrorModalOpen(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="login-error-title"
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:p-8"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h2
                  id="login-error-title"
                  className="text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  تعذر تسجيل الدخول
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setErrorModalOpen(false)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setErrorModalOpen(false)}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-700 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              حسناً
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
