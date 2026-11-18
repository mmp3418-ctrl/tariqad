"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { clearSession, readSession, type AdminSession } from "@/lib/auth";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = readSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        جاري التحميل...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-teal-700 dark:text-teal-300">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-semibold">لوحة التحكم</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              مرحباً، {session?.username}
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              تم تسجيل الدخول بنجاح إلى منصة طارق. هذه صفحة مؤقتة للوحة الإدارة.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            خروج
          </button>
        </div>
      </div>
    </main>
  );
}
