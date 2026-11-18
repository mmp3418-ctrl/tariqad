"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { clearSession, readSession } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";

const NAV = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/admin/settings", label: "إعدادات الموقع", icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("admin");

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUsername(session.username);
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        جاري التحميل...
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-slate-50 dark:bg-slate-950">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed start-3 top-3 z-40 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm lg:hidden dark:border-slate-800 dark:bg-slate-900"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5 text-slate-900 dark:text-slate-100" />
        </button>

        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/45 lg:hidden"
            aria-label="إغلاق"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 start-0 z-50 flex w-[min(18rem,88vw)] flex-col bg-[#0b3d3a] text-white shadow-2xl transition-transform duration-300 lg:static lg:w-72 lg:translate-x-0 ${
            open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            <div>
              <p className="text-xs font-medium text-teal-200/80">لوحة التحكم</p>
              <h1 className="text-xl font-extrabold">منصة طارق</h1>
              <p className="mt-1 truncate text-xs text-teal-100/70">{username}</p>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white text-teal-900 shadow-sm"
                      : "text-teal-50/90 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-teal-50/90 transition hover:bg-rose-500/20 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <main className="flex-1 px-3 py-5 pt-16 sm:px-5 lg:px-8 lg:py-8 lg:pt-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
